import { describeChange } from "@/incident/change-text";
import type { IncidentFacts } from "@/incident/detect";

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

export type NotifyIncident = { incidentId: string; facts: IncidentFacts };
export type OutgoingMessage = { incidentIds: string[]; text: string };

/** 이름·조건·AI 요약은 넣지 않는다. facts의 공고 원문 값과 변화만 쓴다 (FR-019) */
function incidentText({ incidentId, facts }: NotifyIncident, baseUrl: string): string {
  const change = describeChange(facts.change);
  return [
    `[HomeFit] 공고 변화: ${facts.title}`,
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
      text: `[HomeFit] 맞는 공고에 사건 ${incidents.length}건이 생겼습니다. 홈에서 확인해 주세요.\n${baseUrl}/incidents`,
    }];
  }
  return incidents.map((incident) => ({ incidentIds: [incident.incidentId], text: incidentText(incident, baseUrl) }));
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
