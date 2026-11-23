import type { Notice } from "@/watch/notice";

/** 공고·정책 조건. ERD policy_conditions */
export type PolicyCondition = {
  sidoCode: string;
  sigunguCode: string | null;
  /** "ALL"이 있으면 공급 유형으로 거르지 않는다 */
  supplyTypes: readonly string[];
  maxMonthlyRent: number | null;
  age: number | null;
  /** 대상(빈 목록 = 모두). spec 001 v0.6, ERD policy_conditions.target_groups */
  targetGroups: readonly TargetGroup[];
};

export const ALL_SUPPLY_TYPES = "ALL";

export const TARGET_GROUPS = ["youth", "newlywed", "multichild", "elderly"] as const;
export type TargetGroup = (typeof TARGET_GROUPS)[number];

// 마이홈 공고는 대상을 제목에만 적는다. 제목 낱말로 대상을 읽는다(자격 판정이 아니다, GLOSSARY 대상)
export const TARGET_WORDS: Record<TargetGroup, readonly string[]> = {
  youth: ["청년", "대학생", "사회초년생", "취업준비생"],
  newlywed: ["신혼", "신생아"],
  multichild: ["다자녀"],
  elderly: ["고령자", "고령"],
};

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
    matchesRent(notice, condition) &&
    matchesTarget(notice, condition)
  );
}

// Q15 임시 처리: 조건의 시군구가 비거나 공고에 시군구가 없으면 시도만 비교한다
// spec 001 v0.6: 전세임대는 전국 수시모집인데 마이홈이 한 지역 사무소로만 올린다(예: 청년 전세임대 = 서울)
const NATIONWIDE_SUPPLY_TYPE = "전세임대";

function matchesRegion(notice: Notice, condition: PolicyCondition): boolean {
  if (notice.supplyType === NATIONWIDE_SUPPLY_TYPE && notice.sigunguCode === null) return true;
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

/** 제목에 적힌 대상. 낱말이 없으면 빈 목록(누구나 보는 공고) */
export function noticeTargets(title: string): TargetGroup[] {
  return TARGET_GROUPS.filter((group) => TARGET_WORDS[group].some((word) => title.includes(word)));
}

// spec 001 v0.6: 대상을 골랐으면, 고르지 않은 대상만 적힌 공고는 숨긴다. 대상 낱말이 없는 공고는 보인다
function matchesTarget(notice: Notice, condition: PolicyCondition): boolean {
  if (condition.targetGroups.length === 0) return true;
  const targets = noticeTargets(notice.title);
  return targets.length === 0 || targets.some((group) => condition.targetGroups.includes(group));
}
