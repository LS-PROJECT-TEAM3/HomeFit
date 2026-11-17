/**
 * 수집한 공고 한 건을 출처와 상관없이 같은 모양으로 담는다.
 * 날짜는 모두 한국 날짜 "YYYY-MM-DD" 문자열이다.
 * ERD source_items (docs/ERD.md)
 */
export type Notice = {
  /** 수집 한 줄의 ID(마이홈은 공고 ID + 단지 번호). ERD source_items.external_id */
  externalId: string;
  /** 공고 ID. 사건 중복은 이 값으로 막는다 (문제정의 중복 기준 "같은 공고 ID는 사용자마다 한 번") */
  announcementId: string;
  title: string;
  sidoCode: string | null;
  sigunguCode: string | null;
  supplyType: string | null;
  /** 월 임대료(원). 여러 개면 가장 낮은 값 // Q15 임시 처리 */
  monthlyRent: number | null;
  announcedOn: string | null;
  applyStart: string | null;
  applyEnd: string | null;
  url: string | null;
};

/**
 * 한 번 수집에 같은 줄 ID가 여러 번 오면 마지막 것만 남긴다(자리는 처음 나온 곳).
 * 실제 마이홈 응답에서 겹친 줄이 와서 한 번에 저장하다 실패했다 (2026-11-17)
 */
export function uniqueByExternalId(notices: readonly Notice[]): Notice[] {
  const byId = new Map<string, Notice>();
  for (const notice of notices) byId.set(notice.externalId, notice);
  return [...byId.values()];
}
