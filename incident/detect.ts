import { matchesCondition, type PolicyCondition } from "@/incident/match";
import { changeDedupKey, mergeByAnnouncement, type ChangeKind, type FieldChange, type NoticeChange } from "@/incident/notice-change";
import type { Notice } from "@/watch/notice";

export type ConditionOwner = { userId: string; condition: PolicyCondition };

/** 사건 상세에 보일 원문 값과 무엇이 바뀌었는지. AI 글이 이 값을 덮지 않는다 (FR-009, FR-010) */
export type IncidentFacts = Notice & {
  change?: { kind: ChangeKind; changes: FieldChange[]; relatedAnnouncementId: string | null };
};

export type PlannedIncident = {
  userId: string;
  dedupKey: string;
  externalId: string;
  facts: IncidentFacts;
};

type PlanInput = {
  changes: readonly NoticeChange[];
  owners: readonly ConditionOwner[];
  /** 이미 있는 사건 "userId|dedupKey" */
  existingKeys: ReadonlySet<string>;
  today: string;
  sourceCode: string;
};

/**
 * FR-006, FR-016 (spec 001 v0.2): 공고 변화 중 사용자 조건에 맞는 것만 사건으로 만든다.
 * 같은 변화(단지 여럿 포함)는 사용자마다 하나, 이미 있는 사건은 건너뛴다.
 */
export function planChangeIncidents({ changes, owners, existingKeys, today, sourceCode }: PlanInput): PlannedIncident[] {
  const seen = new Set(existingKeys);
  const planned: PlannedIncident[] = [];
  for (const { userId, condition } of owners) {
    // 단지마다 시군구·임대료가 달라서, 이 사람에게 맞는 단지만 고른 뒤 공고·종류별로 하나로 합친다 (12단계 리뷰 2번)
    const mine = mergeByAnnouncement(changes.filter((change) => matchesCondition(change.notice, condition, today)));
    for (const change of mine) {
      const dedupKey = changeDedupKey(sourceCode, change);
      const key = `${userId}|${dedupKey}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const { kind, changes: fields, relatedAnnouncementId } = change;
      planned.push({
        userId,
        dedupKey,
        externalId: change.notice.externalId,
        facts: { ...change.notice, change: { kind, changes: fields, relatedAnnouncementId } },
      });
    }
  }
  return planned;
}
