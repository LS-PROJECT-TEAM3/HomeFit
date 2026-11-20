import {
  buildMessages,
  combineChannels,
  type AllChannelStats,
  type NotifyIncident,
  readLookupResult,
  selectToNotify,
  type NotifyRecord,
  type NotifySetting,
} from "@/incident/notify";
import { runWebPush, supabaseWebPushDeps, webPushConfigured, type WebPushStats } from "@/incident/web-push.server";
import type { AdminClient } from "@/lib/supabase/admin";
import { maskSecrets } from "@/watch/mask";

// FR-018, FR-019 (spec 001 v0.3): 팀 슬랙 봇으로 사람 찾기·DM 보내기, 알림 기록
const SLACK_API = "https://slack.com/api";
const TIMEOUT_MS = 5_000;

type SlackAnswer = { ok?: boolean; error?: string } & Record<string, unknown>;

export function slackConfigured(): boolean {
  return Boolean(process.env.SLACK_BOT_TOKEN);
}

/** 사건 상세 링크의 앞부분. 운영은 Vercel 운영 주소 */
export function appBaseUrl(): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

async function callSlack(method: string, init: { query?: Record<string, string>; body?: object }): Promise<SlackAnswer> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return { ok: false, error: "not_authed" };
  const query = init.query ? `?${new URLSearchParams(init.query)}` : "";
  try {
    const response = await fetch(`${SLACK_API}/${method}${query}`, {
      method: init.body ? "POST" : "GET",
      headers: { authorization: `Bearer ${token}`, ...(init.body ? { "content-type": "application/json; charset=utf-8" } : {}) },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return (await response.json()) as SlackAnswer;
  } catch (error) {
    return { ok: false, error: error instanceof Error && error.name === "TimeoutError" ? "timeout" : "network_error" };
  }
}

export async function lookupSlackUser(email: string) {
  return readLookupResult(await callSlack("users.lookupByEmail", { query: { email } }));
}

/** 봇이 그 사람에게 DM을 보낸다(chat:write, 채널 자리에 사람 ID) */
export async function postSlackMessage(slackUserId: string, text: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const answer = await callSlack("chat.postMessage", { body: { channel: slackUserId, text } });
  return answer.ok ? { ok: true } : { ok: false, error: maskSecrets(String(answer.error ?? "unknown"), [process.env.SLACK_BOT_TOKEN ?? ""]) };
}

export type NotifyCandidate = { incidentId: string; userId: string; detectedAt: string; facts: NotifyIncident["facts"] };
export type NotifyStats = { sent: number; failed: number; retried: number };

async function loadSettings(db: AdminClient, userIds: string[]): Promise<Map<string, NotifySetting>> {
  if (userIds.length === 0) return new Map();
  const { data, error } = await db.from("notification_settings").select("user_id, enabled, slack_user_id, enabled_at").in("user_id", userIds);
  if (error) throw new Error(`알림 설정을 읽지 못했습니다: ${error.message}`);
  return new Map(data.map((row) => [row.user_id, { enabled: row.enabled, slackUserId: row.slack_user_id, enabledAt: row.enabled_at }]));
}

/** 지난 수집에서 한 번 실패한 사건(다시 보낼 것) */
async function loadRetries(db: AdminClient): Promise<{ candidates: NotifyCandidate[]; records: Map<string, NotifyRecord> }> {
  const { data, error } = await db.from("notifications").select("incident_id, status, attempts").eq("channel", "slack").eq("status", "failed").lt("attempts", 2);
  if (error) throw new Error(`알림 기록을 읽지 못했습니다: ${error.message}`);
  const records = new Map(data.map((row) => [row.incident_id, { status: row.status, attempts: row.attempts }]));
  if (records.size === 0) return { candidates: [], records };
  const { data: incidents, error: readError } = await db.from("incidents").select("id, user_id, detected_at, facts").in("id", [...records.keys()]);
  if (readError) throw new Error(`다시 보낼 사건을 읽지 못했습니다: ${readError.message}`);
  const candidates = incidents.map((row) => ({ incidentId: row.id, userId: row.user_id, detectedAt: row.detected_at, facts: row.facts as unknown as NotifyIncident["facts"] }));
  return { candidates, records };
}

async function saveRecords(db: AdminClient, rows: { incidentId: string; userId: string; ok: boolean; error: string | null; attempts: number }[]) {
  if (rows.length === 0) return;
  const now = new Date().toISOString();
  const { error } = await db.from("notifications").upsert(
    rows.map((row) => ({
      incident_id: row.incidentId, user_id: row.userId, channel: "slack", status: row.ok ? "sent" : "failed",
      attempts: row.attempts, last_error: row.error, sent_at: row.ok ? now : null,
    })),
    { onConflict: "incident_id,channel" },
  );
  if (error) throw new Error(`알림 기록을 저장하지 못했습니다: ${error.message}`);
}

/**
 * FR-019 (spec 001 v0.3): 이번 수집의 새 사건과 지난 실패를 슬랙 DM으로 보낸다.
 * 알림이 실패해도 사건은 그대로 두고 기록만 "실패"로 남긴다. 토큰이 없으면 아무것도 하지 않는다.
 */
export async function notifyIncidents(db: AdminClient, created: NotifyCandidate[]): Promise<NotifyStats> {
  if (!slackConfigured()) return { sent: 0, failed: 0, retried: 0 };
  const retries = await loadRetries(db);
  const all = [...created, ...retries.candidates];
  const settings = await loadSettings(db, [...new Set(all.map((c) => c.userId))]);
  const picked = selectToNotify({ incidents: all, settings, records: retries.records });
  const stats: NotifyStats = { sent: 0, failed: 0, retried: picked.filter((p) => retries.records.has(p.incidentId)).length };
  let slackDown = false;
  for (const userId of new Set(picked.map((p) => p.userId))) {
    const mine = picked.filter((p) => p.userId === userId);
    const slackUserId = settings.get(userId)?.slackUserId ?? "";
    for (const message of buildMessages(mine, appBaseUrl())) {
      // 슬랙이 한 번 멈추면 이번 수집의 남은 DM은 부르지 않고 "실패"로 남긴다(다음 수집에 한 번 더). 수집 시간 제한 300초를 지키려고 (리뷰 2026-11-17)
      const result = slackDown ? { ok: false as const, error: "slack_down_skipped" } : await postSlackMessage(slackUserId, message.text);
      if (!result.ok && (result.error === "timeout" || result.error === "network_error")) slackDown = true;
      await saveRecords(db, message.incidentIds.map((incidentId) => ({
        incidentId, userId, ok: result.ok, error: result.ok ? null : result.error,
        attempts: (retries.records.get(incidentId)?.attempts ?? 0) + 1,
      })));
      stats[result.ok ? "sent" : "failed"] += message.incidentIds.length;
    }
  }
  return stats;
}

/**
 * spec 021: 슬랙(FR-019 spec 001)과 웹 푸시(FR-003 spec 021)를 함께(동시에) 돌린다. 한쪽이 실패해도 다른 쪽은 보내고,
 * 실패는 errors에 담아 돌려준다(던지지 않음). 수집은 errors가 있으면 실행 기록에 "알림 실패"로 남긴다
 */
export async function notifyAllChannels(db: AdminClient, created: NotifyCandidate[]): Promise<AllChannelStats<NotifyStats, WebPushStats>> {
  const noPush: WebPushStats = { sent: 0, failed: 0, retried: 0, removed: 0 };
  const [slack, webPush] = await Promise.allSettled([
    notifyIncidents(db, created),
    webPushConfigured() ? runWebPush(supabaseWebPushDeps(db, appBaseUrl()), created) : Promise.resolve(noPush),
  ]);
  return combineChannels(slack, webPush, { slack: { sent: 0, failed: 0, retried: 0 }, webPush: noPush });
}
