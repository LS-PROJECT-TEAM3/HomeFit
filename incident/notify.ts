import { describeChange } from "@/incident/change-text";
import type { IncidentFacts } from "@/incident/detect";
import type { HumidityFacts } from "@/incident/humidity-detect";
import type { RentFacts } from "@/incident/rent-detect";

// FR-018, FR-019 (spec 001 v0.3): 슬랙 알림의 판단. 순수 함수 (보내기는 notify.server.ts)

/** Q20: 한 사람에게 한 수집에서 사건이 이만큼 이상이면 메시지 하나로 묶는다 */
export const BUNDLE_THRESHOLD = 6;
/** 처음 1번 + 다음 수집에 1번 */
export const MAX_ATTEMPTS = 2;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const UNAVAILABLE = "슬랙 알림을 아직 쓸 수 없습니다. 관리자에게 문의해 주세요.";

export function normalizeSlackEmail(input: string): { ok: true; email: string } | { ok: false; message: string } {
  const email = input.trim();
  return EMAIL.test(email) ? { ok: true, email } : { ok: false, message: "이메일 형식이 아닙니다. 예: name@example.com" };
}

const NOT_USABLE = new Set(["invalid_auth", "not_authed", "missing_scope", "account_inactive", "token_revoked", "no_permission"]);

/** 슬랙 users.lookupByEmail 답 → 슬랙 사람 ID 또는 사용자에게 보일 문구 */
export function readLookupResult(body: unknown): { ok: true; slackUserId: string } | { ok: false; message: string } {
  const record = typeof body === "object" && body !== null ? (body as { ok?: unknown; error?: unknown; user?: { id?: unknown } }) : {};
  if (record.ok === true && typeof record.user?.id === "string") return { ok: true, slackUserId: record.user.id };
  if (record.error === "users_not_found") {
    return { ok: false, message: "이 이메일로 팀 슬랙에서 사람을 찾지 못했습니다. 팀 슬랙에 가입한 이메일인지 확인해 주세요." };
  }
  if (typeof record.error === "string" && NOT_USABLE.has(record.error)) return { ok: false, message: UNAVAILABLE };
  return { ok: false, message: "슬랙에서 사람을 찾지 못했습니다. 잠시 뒤 다시 해 주세요." };
}

/** 공고 변화(주거 기회) 또는 습도·결로(위험, spec 003 FR-009) */
export type NotifyIncident = { incidentId: string; facts: IncidentFacts | HumidityFacts | RentFacts };
export type OutgoingMessage = { incidentIds: string[]; text: string };

function isHumidity(facts: NotifyIncident["facts"]): facts is HumidityFacts {
  return (facts as HumidityFacts).kind === "humidity";
}

function isRent(facts: NotifyIncident["facts"]): facts is RentFacts {
  return (facts as RentFacts).kind === "rent";
}

/** spec 008 FR-007: 중간값·거래 수·링크만. 지역(시군구)과 AI 요약은 넣지 않는다 */
function rentText(incidentId: string, facts: RentFacts, baseUrl: string): string {
  const won = (value: number) => `${Math.round(value / 10_000).toLocaleString("ko-KR")}만 원`;
  return [
    `[HomeFit] 위험: ${facts.title}`,
    ...facts.diffs.map((d) => `${d.field === "monthlyRent" ? "월세" : "보증금"} ${won(d.base)} → 주변 중간값 ${won(d.median)} (${d.percent > 0 ? "+" : ""}${d.percent}%)`),
    `${facts.months[0]}~${facts.months[1]} 실거래 ${facts.count}건 기준`,
    `${baseUrl}/incidents/${incidentId}`,
  ].join("\n");
}

/** spec 003 FR-009: 측정값·추정 숫자와 할 날·링크만. 집 위치(시군구)와 AI 요약은 넣지 않는다 */
function humidityText(incidentId: string, facts: HumidityFacts, baseUrl: string): string {
  return [
    `[HomeFit] 위험: ${facts.title}`,
    `창 표면 ${facts.surfaceC.toFixed(1)}°C(추정) · 이슬점 ${facts.dewPointC.toFixed(1)}°C · 바깥 ${facts.outdoorC}°C`,
    `할 날 ${facts.dueDate} · 환기·제습 대응 계획을 확인해 주세요`,
    `${baseUrl}/incidents/${incidentId}`,
  ].join("\n");
}

/** 이름·조건·AI 요약은 넣지 않는다. facts의 공고 원문 값과 변화만 쓴다 (FR-019) */
function incidentText({ incidentId, facts }: NotifyIncident, baseUrl: string): string {
  if (isHumidity(facts)) return humidityText(incidentId, facts, baseUrl);
  if (isRent(facts)) return rentText(incidentId, facts, baseUrl);
  const change = describeChange(facts.change);
  return [
    `[HomeFit] 주거 기회: ${facts.title}`,
    ...(change?.lines ?? []),
    ...(change?.note ? [change.note] : []),
    `마감 ${facts.applyEnd ?? "공고문 확인"}`,
    `${baseUrl}/incidents/${incidentId}`,
  ].join("\n");
}

/** 한 사람의 이번 사건들 → 보낼 메시지. 6건 이상이면 하나로 묶는다 (Q20) */
export function buildMessages(incidents: readonly NotifyIncident[], baseUrl: string): OutgoingMessage[] {
  if (incidents.length >= BUNDLE_THRESHOLD) {
    return [{
      incidentIds: incidents.map((i) => i.incidentId),
      text: `[HomeFit] 새 위험·기회 알림 ${incidents.length}건이 생겼습니다. 홈에서 확인해 주세요.\n${baseUrl}/incidents`,
    }];
  }
  return incidents.map((incident) => ({ incidentIds: [incident.incidentId], text: incidentText(incident, baseUrl) }));
}

type ChannelStats = { sent: number; failed: number; retried: number };
export type AllChannelStats<S extends ChannelStats, W extends ChannelStats> = ChannelStats & { slack: S; webPush: W; errors: string[] };

const reasonText = (reason: unknown) => (reason instanceof Error ? reason.message : String(reason));

/** spec 021: 슬랙·웹 푸시 결과를 합친다. 한쪽이 실패해도 다른 쪽 결과는 남긴다(ponytail-review 3번). 실패한 쪽은 0건 */
export function combineChannels<S extends ChannelStats, W extends ChannelStats>(
  slack: PromiseSettledResult<S>, webPush: PromiseSettledResult<W>, empty: { slack: S; webPush: W },
): AllChannelStats<S, W> {
  const s = slack.status === "fulfilled" ? slack.value : empty.slack;
  const w = webPush.status === "fulfilled" ? webPush.value : empty.webPush;
  const errors = [
    ...(slack.status === "rejected" ? [`슬랙: ${reasonText(slack.reason)}`] : []),
    ...(webPush.status === "rejected" ? [`웹 푸시: ${reasonText(webPush.reason)}`] : []),
  ];
  return { sent: s.sent + w.sent, failed: s.failed + w.failed, retried: s.retried + w.retried, slack: s, webPush: w, errors };
}

/** 실행 기록 notify 단계 상태: 오류가 있으면 실패, 보낸 것이 없으면 건너뜀 */
export function notifyStepStatus(stats: { sent: number; failed: number; errors: string[] }): "failed" | "skipped" | "succeeded" {
  if (stats.errors.length > 0) return "failed";
  return stats.sent + stats.failed === 0 ? "skipped" : "succeeded";
}

export type NotifySetting = { enabled: boolean; slackUserId: string | null; enabledAt: string | null };
export type NotifyRecord = { status: string; attempts: number };
type Candidate = NotifyIncident & { userId: string; detectedAt: string };

function due(incident: Candidate, setting: NotifySetting | undefined, record: NotifyRecord | undefined): boolean {
  if (!setting?.enabled || !setting.slackUserId || !setting.enabledAt) return false;
  // 알림을 켜기 전에 생긴 사건은 보내지 않는다 (spec 001 경계)
  if (incident.detectedAt < setting.enabledAt) return false;
  if (!record) return true;
  return record.status === "failed" && record.attempts < MAX_ATTEMPTS;
}

/** FR-019: 이번에 보낼 사건. 보낸 것은 다시 안 보내고, 실패는 한 번만 다시 */
export function selectToNotify({ incidents, settings, records }: {
  incidents: readonly Candidate[];
  settings: ReadonlyMap<string, NotifySetting>;
  records: ReadonlyMap<string, NotifyRecord>;
}): Candidate[] {
  return incidents.filter((incident) => due(incident, settings.get(incident.userId), records.get(incident.incidentId)));
}
