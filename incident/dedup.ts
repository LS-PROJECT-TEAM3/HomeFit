import type { Notice } from "@/watch/notice";

// FR-006 (spec 001), ERD incidents.dedup_key: (user_id, dedup_key)로 사용자마다 한 번.
// 단지가 여러 개인 공고도 공고 ID 하나로 묶는다 (문제정의 중복 기준)
export function housingSupportDedupKey(sourceCode: string, announcementId: string): string {
  return `housing_support:${sourceCode}:${announcementId}`;
}

/**
 * FR-006 (spec 001): 신청 기간·조건이 바뀌었는지 비교할 지문. ERD source_items.content_hash
 * 원문 링크는 사용자가 할 일을 바꾸지 않아 넣지 않는다.
 */
export function noticeFingerprint(notice: Notice): string {
  return JSON.stringify([
    notice.title,
    notice.sidoCode,
    notice.sigunguCode,
    notice.supplyType,
    notice.monthlyRent,
    notice.announcedOn,
    notice.applyStart,
    notice.applyEnd,
  ]);
}
