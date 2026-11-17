const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 한국 날짜 "YYYY-MM-DD". 서버는 UTC로 돌기 때문에 마감 비교 전에 바꾼다.
 * @param now 현재 시각. 순수 함수라 부르는 쪽이 넘긴다
 */
export function toKstDate(now: Date): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** 한국 시각 "YYYY-MM-DDTHH:mm"(화면 datetime-local 칸 값). spec 003 FR-002 */
export function toKstDateTime(at: Date): string {
  return new Date(at.getTime() + KST_OFFSET_MS).toISOString().slice(0, 16);
}
