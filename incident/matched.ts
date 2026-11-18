import { matchesCondition, type PolicyCondition } from "@/incident/match";
import type { Notice } from "@/watch/notice";

export type FollowDecision = "follow" | "ignore";
/** new: 아직 정하지 않음 (spec 001 v0.5 FR-020) */
export type MatchedNotice = { notice: Notice; expired: boolean; isSimulated: boolean; decision: FollowDecision | "new" };

// 마감이 지난 공고도 목록에는 "마감"으로 보여 주므로 마감 날짜 검사는 여기서 따로 한다
const NO_DEADLINE_CHECK = "0000-01-01";

function compareOpen(a: Notice, b: Notice): number {
  if (a.applyEnd === b.applyEnd) return a.title.localeCompare(b.title, "ko");
  if (a.applyEnd === null) return 1;
  if (b.applyEnd === null) return -1;
  return a.applyEnd < b.applyEnd ? -1 : 1;
}

/**
 * FR-005, FR-017 (spec 001 v0.2): 사용자 조건에 맞는 공고. 사건이 아니고 승인할 것도 없다.
 * 같은 공고의 단지 여럿은 한 줄로, 마감 가까운 순, 마감 지난 공고는 맨 아래.
 */
export function listMatchedNotices({ notices, condition, today, decisions = new Map() }: {
  notices: readonly Notice[]; condition: PolicyCondition | null; today: string; decisions?: ReadonlyMap<string, FollowDecision>;
}): MatchedNotice[] {
  if (!condition) return [];
  const byAnnouncement = new Map<string, Notice>();
  for (const notice of notices) {
    if (byAnnouncement.has(notice.announcementId)) continue;
    if (matchesCondition(notice, condition, NO_DEADLINE_CHECK)) byAnnouncement.set(notice.announcementId, notice);
  }
  const all = [...byAnnouncement.values()];
  const isExpired = (n: Notice) => n.applyEnd !== null && n.applyEnd < today;
  // FR-020: 새 공고·팔로우는 마감 순, 관심 없음은 그 아래, 마감 지난 공고는 맨 아래
  const ignored = (n: Notice) => decisions.get(n.announcementId) === "ignore";
  const open = all.filter((n) => !isExpired(n) && !ignored(n)).sort(compareOpen);
  const openIgnored = all.filter((n) => !isExpired(n) && ignored(n)).sort(compareOpen);
  const expired = all.filter(isExpired).sort((a, b) => compareOpen(b, a));
  return [...open, ...openIgnored, ...expired].map((notice) => ({
    decision: decisions.get(notice.announcementId) ?? ("new" as const),
    notice,
    expired: isExpired(notice),
    // 가짜 묶음(watch/sim-fixtures.ts)은 공고 ID 앞에 SIM-을 붙인다
    isSimulated: notice.announcementId.startsWith("SIM-"),
  }));
}

export type ComplexSummary = { externalId: string; name: string; sigunguCode: string | null; monthlyRent: number | null };

/** FR-017 수용 기준 4 (spec 001 v0.4): 공고 상세의 단지별 지역·임대료. 같은 단지(외부 ID)는 한 번 */
export function noticeComplexes(notices: readonly Notice[]): ComplexSummary[] {
  const byId = new Map<string, ComplexSummary>();
  for (const n of notices) {
    if (!byId.has(n.externalId)) {
      byId.set(n.externalId, { externalId: n.externalId, name: n.complexName ?? "단지 정보 없음", sigunguCode: n.sigunguCode, monthlyRent: n.monthlyRent });
    }
  }
  return [...byId.values()].sort((a, b) => a.externalId.localeCompare(b.externalId));
}
