import webpush from "web-push";
import { MAX_ATTEMPTS, type NotifyRecord } from "@/incident/notify";
import type { NotifyCandidate } from "@/incident/notify.server";
import { bundleDevices, pushOutcome, pushPayloads, selectToPush, settleIncident, type PushDevice } from "@/incident/web-push";
import type { AdminClient } from "@/lib/supabase/admin";

// spec 021 FR-003·FR-005: 웹 푸시 보내기와 알림 기록. 판단은 web-push.ts(순수), 여기는 DB·푸시 서비스
const TIMEOUT_MS = 5_000;
const TTL_SECONDS = 24 * 60 * 60; // 기기가 꺼져 있으면 하루까지 기다렸다 전한다

export type DeviceWithKeys = PushDevice & { endpoint: string; p256dh: string; auth: string };
export type PushRecordRow = { incidentId: string; userId: string; ok: boolean; error: string | null; attempts: number };
export type WebPushStats = { sent: number; failed: number; retried: number; removed: number };

/** 시험에서 가짜로 바꿔 끼우는 바깥 일(DB·푸시 서비스) */
export type WebPushDeps = {
  baseUrl: string;
  loadRetries: () => Promise<{ candidates: NotifyCandidate[]; records: Map<string, NotifyRecord> }>;
  loadDevices: (userIds: string[]) => Promise<DeviceWithKeys[]>;
  /** 푸시 서비스 응답 코드. 응답이 없으면(시간 초과·네트워크) null */
  send: (device: DeviceWithKeys, payload: string) => Promise<number | null>;
  saveRecords: (rows: PushRecordRow[]) => Promise<void>;
  removeDevice: (deviceId: string) => Promise<void>;
};

/** E6: 키 3개가 다 있어야 쓴다 */
export function webPushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

/** 시간 초과·네트워크 오류(응답 없음)만 null. 열쇠·설정이 잘못된 것 같은 그 밖의 오류는 그 기기만 실패(0)로 (ponytail-review 1번) */
function codeOfError(error: unknown): number | null {
  if (error instanceof webpush.WebPushError) return error.statusCode;
  const network = error instanceof Error && (error.message === "Socket timeout" || typeof (error as { code?: unknown }).code === "string");
  return network ? null : 0;
}

/** 기기 하나에 보낸다. 404·410 같은 거절도 코드로 돌려준다 */
export async function sendToDevice(device: Pick<DeviceWithKeys, "endpoint" | "p256dh" | "auth">, payload: string): Promise<number | null> {
  try {
    const result = await webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, payload, {
      TTL: TTL_SECONDS,
      timeout: TIMEOUT_MS,
      vapidDetails: { subject: process.env.VAPID_SUBJECT ?? "", publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "", privateKey: process.env.VAPID_PRIVATE_KEY ?? "" },
    });
    return result.statusCode;
  } catch (error) {
    return codeOfError(error);
  }
}

/** gone: 이번 수집에서 지운 기기(같은 수집에서 다시 보내지 않음, ponytail-review 2번) */
type SendState = { down: boolean; gone: Set<string> };

/** 한 통을 그 사람 기기들에 보낸다. 푸시 서비스가 한 번 응답하지 않으면 이번 수집의 남은 알림은 부르지 않는다(수집 시간 제한, 슬랙과 같음) */
async function deliver(deps: WebPushDeps, all: DeviceWithKeys[], payload: string, state: SendState): Promise<{ ok: boolean; error: string | null }> {
  if (state.down) return { ok: false, error: "push_skipped" };
  const targets = all.filter((d) => !state.gone.has(d.id));
  if (targets.length === 0) return { ok: false, error: "push_gone" };
  const codes: (number | null)[] = [];
  for (const target of targets) {
    const code = await deps.send(target, payload);
    codes.push(code);
    if (code === null) { state.down = true; break; }
    if (pushOutcome(code) === "gone") { await deps.removeDevice(target.id); state.gone.add(target.id); }
  }
  const ok = settleIncident(codes.map(pushOutcome)) === "sent";
  if (ok) return { ok, error: null };
  if (codes.includes(null)) return { ok, error: "push_unreachable" };
  const failedCode = codes.find((c) => c !== null && pushOutcome(c) === "failed");
  return { ok, error: failedCode === undefined ? "push_gone" : `push_${failedCode}` };
}

/** FR-003·FR-005: 이번 수집의 새 사건과 지난 실패를 웹 푸시로. 실패해도 사건은 그대로, 기록만 남긴다 */
export async function runWebPush(deps: WebPushDeps, created: NotifyCandidate[]): Promise<WebPushStats> {
  const retries = await deps.loadRetries();
  const all = [...created, ...retries.candidates];
  const devices = await deps.loadDevices([...new Set(all.map((c) => c.userId))]);
  const picked = selectToPush({ incidents: all, devices, records: retries.records });
  const stats: WebPushStats = { sent: 0, failed: 0, retried: picked.filter((p) => retries.records.has(p.incidentId)).length, removed: 0 };
  const state: SendState = { down: false, gone: new Set() };
  for (const userId of new Set(picked.map((p) => p.userId))) {
    const mine = picked.filter((p) => p.userId === userId);
    for (const push of pushPayloads(mine, deps.baseUrl)) {
      const deviceIds = new Set(bundleDevices(mine.filter((p) => push.incidentIds.includes(p.incidentId)).map((p) => p.deviceIds)));
      const result = await deliver(deps, devices.filter((d) => deviceIds.has(d.id)), JSON.stringify(push.payload), state);
      // 받을 기기가 모두 사라졌으면 다시 보낼 대상에서 뺀다(ponytail-review 6번)
      const finished = result.error === "push_gone";
      await deps.saveRecords(push.incidentIds.map((incidentId) => ({
        incidentId, userId, ok: result.ok, error: result.error,
        attempts: finished ? MAX_ATTEMPTS : (retries.records.get(incidentId)?.attempts ?? 0) + 1,
      })));
      stats[result.ok ? "sent" : "failed"] += push.incidentIds.length;
    }
  }
  return { ...stats, removed: state.gone.size };
}

/** 운영에서 쓰는 바깥 일: Supabase 관리자 클라이언트와 web-push */
export function supabaseWebPushDeps(db: AdminClient, baseUrl: string): WebPushDeps {
  return {
    baseUrl,
    loadRetries: async () => {
      const { data, error } = await db.from("notifications").select("incident_id, status, attempts").eq("channel", "web_push").eq("status", "failed").lt("attempts", 2);
      if (error) throw new Error(`웹 푸시 기록을 읽지 못했습니다: ${error.message}`);
      const records = new Map(data.map((row) => [row.incident_id, { status: row.status, attempts: row.attempts }]));
      if (records.size === 0) return { candidates: [], records };
      const { data: incidents, error: readError } = await db.from("incidents").select("id, user_id, detected_at, facts").in("id", [...records.keys()]);
      if (readError) throw new Error(`다시 보낼 사건을 읽지 못했습니다: ${readError.message}`);
      const candidates = incidents.map((row) => ({ incidentId: row.id, userId: row.user_id, detectedAt: row.detected_at, facts: row.facts as unknown as NotifyCandidate["facts"] }));
      return { candidates, records };
    },
    loadDevices: async (userIds) => {
      if (userIds.length === 0) return [];
      const { data, error } = await db.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth, created_at").in("user_id", userIds);
      if (error) throw new Error(`웹 푸시 기기를 읽지 못했습니다: ${error.message}`);
      return data.map((row) => ({ id: row.id, userId: row.user_id, createdAt: row.created_at, endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth }));
    },
    send: (device, payload) => sendToDevice(device, payload),
    saveRecords: async (rows) => {
      if (rows.length === 0) return;
      const now = new Date().toISOString();
      const { error } = await db.from("notifications").upsert(
        rows.map((row) => ({
          incident_id: row.incidentId, user_id: row.userId, channel: "web_push", status: row.ok ? "sent" : "failed",
          attempts: row.attempts, last_error: row.error, sent_at: row.ok ? now : null,
        })),
        { onConflict: "incident_id,channel" },
      );
      if (error) throw new Error(`웹 푸시 기록을 저장하지 못했습니다: ${error.message}`);
    },
    removeDevice: async (deviceId) => {
      const { error } = await db.from("push_subscriptions").delete().eq("id", deviceId);
      if (error) throw new Error(`받을 수 없는 기기를 지우지 못했습니다: ${error.message}`);
    },
  };
}
