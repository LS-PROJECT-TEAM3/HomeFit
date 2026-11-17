import { matchesCondition, type PolicyCondition } from "@/incident/match";
import type { Notice } from "@/watch/notice";

export type MatchedNotice = { notice: Notice; expired: boolean; isSimulated: boolean };

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
export function listMatchedNotices({ notices, condition, today }: { notices: readonly Notice[]; condition: PolicyCondition | null; today: string }): MatchedNotice[] {
  if (!condition) return [];
  const byAnnouncement = new Map<string, Notice>();
  for (const notice of notices) {
    if (byAnnouncement.has(notice.announcementId)) continue;
    if (matchesCondition(notice, condition, NO_DEADLINE_CHECK)) byAnnouncement.set(notice.announcementId, notice);
  }
  const all = [...byAnnouncement.values()];
  const isExpired = (n: Notice) => n.applyEnd !== null && n.applyEnd < today;
  const open = all.filter((n) => !isExpired(n)).sort(compareOpen);
  const expired = all.filter(isExpired).sort((a, b) => compareOpen(b, a));
  return [...open, ...expired].map((notice) => ({
    notice,
    expired: isExpired(notice),
    // 가짜 묶음(watch/sim-fixtures.ts)은 공고 ID 앞에 SIM-을 붙인다
    isSimulated: notice.announcementId.startsWith("SIM-"),
  }));
}
