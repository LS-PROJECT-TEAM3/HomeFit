import { housingSupportDedupKey } from "@/incident/dedup";
import { matchesCondition, type PolicyCondition } from "@/incident/match";
import type { Notice } from "@/watch/notice";

export type ConditionOwner = { userId: string; condition: PolicyCondition };

export type PlannedIncident = {
  userId: string;
  dedupKey: string;
  externalId: string;
  /** 사건 상세에 보일 원문 값. AI 글이 이 값을 덮지 않는다 (FR-010) */
  facts: Notice;
};

type PlanInput = {
  notices: readonly Notice[];
  owners: readonly ConditionOwner[];
  /** 이미 있는 사건 "userId|dedupKey" */
  existingKeys: ReadonlySet<string>;
  today: string;
  sourceCode: string;
};

/**
 * FR-005, FR-006 (spec 001): 이번 수집에서 새로 만들 사건을 고른다.
 * 같은 공고(단지 여럿)는 사용자마다 하나, 이미 있는 사건은 건너뛴다.
 */
export function planNewIncidents({ notices, owners, existingKeys, today, sourceCode }: PlanInput): PlannedIncident[] {
  const seen = new Set(existingKeys);
  const planned: PlannedIncident[] = [];
  for (const { userId, condition } of owners) {
    for (const notice of notices) {
      const dedupKey = housingSupportDedupKey(sourceCode, notice.announcementId);
      const key = `${userId}|${dedupKey}`;
      if (seen.has(key) || !matchesCondition(notice, condition, today)) continue;
      seen.add(key);
      planned.push({ userId, dedupKey, externalId: notice.externalId, facts: notice });
    }
  }
  return planned;
}
