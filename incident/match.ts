import type { Notice } from "@/watch/notice";

/** 공고·정책 조건. ERD policy_conditions */
export type PolicyCondition = {
  sidoCode: string;
  sigunguCode: string | null;
  /** "ALL"이 있으면 공급 유형으로 거르지 않는다 */
  supplyTypes: readonly string[];
  maxMonthlyRent: number | null;
  age: number | null;
};

export const ALL_SUPPLY_TYPES = "ALL";

/**
 * FR-005 (spec 001): 공고가 이 조건에 맞아 사건이 될지 판단한다.
 * @param today 한국 날짜 "YYYY-MM-DD". 현재 시각은 부르는 쪽에서 넘긴다
 */
export function matchesCondition(
  notice: Notice,
  condition: PolicyCondition | null,
  today: string,
): boolean {
  if (!condition) return false;
  if (notice.applyEnd !== null && notice.applyEnd < today) return false;
  return (
    matchesRegion(notice, condition) &&
    matchesSupplyType(notice, condition) &&
    matchesRent(notice, condition)
  );
}

// Q15 임시 처리: 조건의 시군구가 비거나 공고에 시군구가 없으면 시도만 비교한다
function matchesRegion(notice: Notice, condition: PolicyCondition): boolean {
  if (notice.sidoCode !== condition.sidoCode) return false;
  if (condition.sigunguCode === null || notice.sigunguCode === null) return true;
  return notice.sigunguCode === condition.sigunguCode;
}

function matchesSupplyType(notice: Notice, condition: PolicyCondition): boolean {
  if (condition.supplyTypes.includes(ALL_SUPPLY_TYPES)) return true;
  return notice.supplyType !== null && condition.supplyTypes.includes(notice.supplyType);
}

// Q15 임시 처리: 공고에 임대료가 없으면 맞는 것으로 보고 화면에서 "공고문 확인"을 안내한다
function matchesRent(notice: Notice, condition: PolicyCondition): boolean {
  if (condition.maxMonthlyRent === null || notice.monthlyRent === null) return true;
  return notice.monthlyRent <= condition.maxMonthlyRent;
}
