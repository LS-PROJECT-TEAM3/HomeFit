import { buildMessages, MAX_ATTEMPTS, type NotifyIncident, type NotifyRecord } from "@/incident/notify";

// spec 021 FR-003~005: 웹 푸시 판단. 순수 함수(보내기는 web-push.server.ts).
// 글은 슬랙 알림과 같게 하려고 슬랙 글(buildMessages)을 그대로 나눠 쓴다(E8: 이름·시군구·AI 요약 없음)

export type PushPayload = { title: string; body: string; url: string };
export type OutgoingPush = { incidentIds: string[]; payload: PushPayload };

/** 슬랙 글 한 통 → 첫 줄 제목, 마지막 줄(링크) 여는 주소, 가운데 본문 */
function toPayload(text: string): PushPayload {
  const lines = text.split("\n");
  const last = lines.at(-1) ?? "";
  const hasUrl = lines.length > 1 && /^https?:\/\//.test(last);
  return { title: lines[0], body: lines.slice(1, hasUrl ? -1 : undefined).join("\n"), url: hasUrl ? last : "" };
}

/** FR-003: 한 사람의 이번 사건들 → 보낼 알림. 6개 이상이면 하나로 묶는다(슬랙 Q20과 같음) */
export function pushPayloads(incidents: readonly NotifyIncident[], baseUrl: string): OutgoingPush[] {
  return buildMessages(incidents, baseUrl).map((message) => ({ incidentIds: message.incidentIds, payload: toPayload(message.text) }));
}

export type PushDevice = { id: string; userId: string; createdAt: string };
type Candidate = NotifyIncident & { userId: string; detectedAt: string };

function due(record: NotifyRecord | undefined): boolean {
  if (!record) return true;
  return record.status === "failed" && record.attempts < MAX_ATTEMPTS;
}

/**
 * FR-004, E1: 보낼 사건과 기기. 사건 주인의 기기 중 사건보다 먼저 켠 것 모두(켜기 전 사건은 안 보냄, 슬랙과 같음).
 * 기록은 사람마다 한 번(spec Q1): 보냄은 다시 안 보내고 실패는 한 번만 다시
 */
export function selectToPush({ incidents, devices, records }: {
  incidents: readonly Candidate[];
  devices: readonly PushDevice[];
  records: ReadonlyMap<string, NotifyRecord>;
}): (Candidate & { deviceIds: string[] })[] {
  return incidents
    .filter((incident) => due(records.get(incident.incidentId)))
    .map((incident) => ({
      ...incident,
      deviceIds: devices.filter((d) => d.userId === incident.userId && d.createdAt <= incident.detectedAt).map((d) => d.id),
    }))
    .filter((incident) => incident.deviceIds.length > 0);
}

/** 묶음 한 통을 보낼 기기: 그 안 사건 모두에 해당하는 기기만(켜기 전 사건이 섞이지 않게, ponytail-review 4번) */
export function bundleDevices(deviceIdsPerIncident: readonly (readonly string[])[]): string[] {
  const [first, ...rest] = deviceIdsPerIncident;
  return (first ?? []).filter((id) => rest.every((ids) => ids.includes(id)));
}

export type PushOutcome = "sent" | "gone" | "failed";

/** FR-005, E4·E5: 푸시 서비스 답. 404·410은 그 기기가 더는 받을 수 없음(지운다), 응답이 없으면 null */
export function pushOutcome(statusCode: number | null): PushOutcome {
  if (statusCode !== null && statusCode >= 200 && statusCode < 300) return "sent";
  if (statusCode === 404 || statusCode === 410) return "gone";
  return "failed";
}

/** E1: 여러 기기 중 하나라도 보냈으면 그 사건은 보냄 */
export function settleIncident(outcomes: readonly PushOutcome[]): "sent" | "failed" {
  return outcomes.includes("sent") ? "sent" : "failed";
}

// spec 021 FR-001·E6: 화면 문구("무엇이 안 됐는지 + 할 일")
export const PUSH_UNAVAILABLE = "웹 푸시를 아직 쓸 수 없습니다. 관리자에게 문의해 주세요.";
export const PUSH_DENIED = "브라우저에서 알림을 막았습니다. 브라우저 설정에서 이 사이트 알림을 허용한 뒤 다시 눌러 주세요.";
const BAD_SUBSCRIPTION = "이 브라우저의 알림 정보를 읽지 못했습니다. 페이지를 새로 고친 뒤 다시 켜 주세요.";

export type SubscriptionValue = { endpoint: string; p256dh: string; auth: string };
const BASE64URL = /^[A-Za-z0-9_-]+={0,2}$/;

// 실제 브라우저 푸시 서비스만(크롬·안드로이드, 파이어폭스, 엣지, 사파리·아이폰). 서버가 아무 주소로나 요청을 보내지 않게(3·4단계 리뷰 1번)
const PUSH_HOSTS = ["fcm.googleapis.com", "android.googleapis.com"];
const PUSH_HOST_SUFFIXES = [".push.services.mozilla.com", ".notify.windows.com", ".push.apple.com"];

function isPushServiceUrl(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && url.port === "" && (PUSH_HOSTS.includes(host) || PUSH_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix)));
  } catch {
    return false;
  }
}

/** FR-001: 브라우저가 준 구독 값(PushSubscription.toJSON) 검사. DB 제약(0022)과 같은 기준 */
export function parseSubscription(input: unknown): { ok: true; value: SubscriptionValue } | { ok: false; message: string } {
  const record = typeof input === "object" && input !== null ? (input as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }) : {};
  const { endpoint } = record;
  const p256dh = record.keys?.p256dh;
  const auth = record.keys?.auth;
  const ok =
    typeof endpoint === "string" && endpoint.length <= 2048 && isPushServiceUrl(endpoint) &&
    typeof p256dh === "string" && p256dh.length <= 256 && BASE64URL.test(p256dh) &&
    typeof auth === "string" && auth.length <= 128 && BASE64URL.test(auth);
  return ok ? { ok: true, value: { endpoint, p256dh, auth } } : { ok: false, message: BAD_SUBSCRIPTION };
}
