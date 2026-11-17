import type { Notice } from "@/watch/notice";

/** 바뀌면 사건이 되는 칸 (문제정의 사건 기준 표 (가), spec 001 v0.2 FR-006) */
export type TrackedValues = Pick<Notice, "applyStart" | "applyEnd" | "monthlyRent" | "supplyType">;
export type TrackedField = keyof TrackedValues;
export type FieldChange = { field: TrackedField; before: string | number | null; after: string | number | null };

/** changed: 칸이 바뀜 / correction: 정정공고 / relaxed: 같은 단지 완화·추가모집·재공고 */
export type ChangeKind = "changed" | "correction" | "relaxed";

export type NoticeChange = {
  notice: Notice;
  kind: ChangeKind;
  changes: FieldChange[];
  /** 정정공고가 고친 이전 공고 ID */
  relatedAnnouncementId: string | null;
};

export type ChangeInput = {
  notices: readonly Notice[];
  /** 이번 수집 전에 저장돼 있던 값. 없으면 처음 보인 공고 */
  previousByExternalId: ReadonlyMap<string, TrackedValues>;
  /** 이번 수집 전에 본 공고 ID */
  seenAnnouncementIds: ReadonlySet<string>;
  /** 이번 수집 전에 본 단지 키 */
  seenComplexKeys: ReadonlySet<string>;
  today: string;
};

const TRACKED_FIELDS: readonly TrackedField[] = ["applyStart", "applyEnd", "monthlyRent", "supplyType"];
// FR-016: 마이홈 API에 자격 본문이 없어 제목 낱말로만 안다 (PRD v1.3 8절)
const RELAXED_WORDS = /완화|추가\s*모집|재공고/;

export function trackedValues(notice: TrackedValues): TrackedValues {
  return { applyStart: notice.applyStart, applyEnd: notice.applyEnd, monthlyRent: notice.monthlyRent, supplyType: notice.supplyType };
}

export function diffTracked(before: TrackedValues, after: TrackedValues): FieldChange[] {
  return TRACKED_FIELDS.filter((field) => before[field] !== after[field]).map((field) => ({
    field,
    before: before[field],
    after: after[field],
  }));
}

/** ERD source_items.complex_key: 시군구(없으면 시도) + 단지 이름 */
export function complexKeyOf(notice: Notice): string | null {
  if (!notice.complexName) return null;
  return `${notice.sigunguCode ?? notice.sidoCode ?? "?"}:${notice.complexName}`;
}

function isExpired(notice: Notice, today: string): boolean {
  return notice.applyEnd !== null && notice.applyEnd < today;
}

function changeOfKnown(notice: Notice, previous: TrackedValues): NoticeChange | null {
  const changes = diffTracked(previous, trackedValues(notice));
  return changes.length ? { notice, kind: "changed", changes, relatedAnnouncementId: null } : null;
}

function changeOfNew(notice: Notice, input: ChangeInput): NoticeChange | null {
  const before = notice.beforeAnnouncementId;
  if (before && before !== notice.announcementId && input.seenAnnouncementIds.has(before)) {
    return { notice, kind: "correction", changes: [], relatedAnnouncementId: before };
  }
  const complexKey = complexKeyOf(notice);
  if (complexKey && input.seenComplexKeys.has(complexKey) && RELAXED_WORDS.test(notice.title)) {
    return { notice, kind: "relaxed", changes: [], relatedAnnouncementId: null };
  }
  // 처음 보인 공고는 사건이 아니라 맞는 공고다 (FR-005)
  return null;
}

/**
 * FR-006, FR-016 (spec 001 v0.2): 이번 수집에서 "맞는 공고에 생긴 변화"를 고른다.
 * 저장돼 있던 칸 값과 직접 비교하므로, 0005 전에 저장된 공고도 값이 같으면 변화가 아니다(plan v0.9 처음 한 번 보호).
 */
export function findNoticeChanges(input: ChangeInput): NoticeChange[] {
  const found: NoticeChange[] = [];
  for (const notice of input.notices) {
    if (isExpired(notice, input.today)) continue;
    const previous = input.previousByExternalId.get(notice.externalId);
    const change = previous ? changeOfKnown(notice, previous) : changeOfNew(notice, input);
    if (change) found.push(change);
  }
  return found;
}

/**
 * ERD incidents.dedup_key: 같은 변화는 사용자마다 한 번.
 * 같은 공고의 여러 단지가 같이 바뀌면 하나로 묶이도록 공고 ID와 바뀐 뒤 값으로 만든다.
 */
export function changeDedupKey(sourceCode: string, change: NoticeChange): string {
  const base = `housing_support:${sourceCode}:${change.notice.announcementId}`;
  if (change.kind !== "changed") return `${base}:${change.kind}`;
  const after = change.changes.map((c) => [c.field, c.after]);
  return `${base}:changed:${JSON.stringify(after)}`;
}
