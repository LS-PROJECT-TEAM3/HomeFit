import type { Policy } from "@/watch/youth-policy";

/** 정책을 거르는 데 쓰는 조건 칸만. ERD policy_conditions */
export type PolicyFilter = { sidoCode: string; sigunguCode: string | null; age: number | null };

export type MatchedPolicy = { policy: Policy };

// spec 006 FR-003: 지역 목록에 내 시군구가 있으면 맞음. 내 시군구가 없으면 시도만 본다. 목록이 비면 전국(E4)
function matchesRegion(policy: Policy, filter: PolicyFilter): boolean {
  if (policy.regionCodes.length === 0) return true;
  if (filter.sigunguCode) return policy.regionCodes.includes(filter.sigunguCode);
  return policy.regionCodes.some((code) => code.startsWith(filter.sidoCode));
}

// spec 006 Q3 가정: 나이 숫자가 있으면 그 범위로 거른다. 자격 판정이 아니라 목록 거르기다
function matchesAge(policy: Policy, age: number | null): boolean {
  if (age === null) return true;
  if (policy.minAge !== null && age < policy.minAge) return false;
  return policy.maxAge === null || age <= policy.maxAge;
}

const KIND_ORDER = { period: 0, always: 1, unknown: 2 } as const;

function compare(a: Policy, b: Policy): number {
  const byKind = KIND_ORDER[a.periodKind] - KIND_ORDER[b.periodKind];
  if (byKind !== 0) return byKind;
  if (a.applyEnd !== b.applyEnd) return (a.applyEnd ?? "") < (b.applyEnd ?? "") ? -1 : 1;
  return a.title.localeCompare(b.title, "ko");
}

/**
 * spec 006 FR-003: 내 조건에 맞고 신청이 끝나지 않은 정책. 마감 가까운 순 → 상시 → 기간 공고문 확인.
 * @param today 한국 날짜 "YYYY-MM-DD". 현재 시각은 부르는 쪽에서 넘긴다
 */
export function listMatchedPolicies({ policies, condition, today }: {
  policies: readonly Policy[]; condition: PolicyFilter | null; today: string;
}): MatchedPolicy[] {
  if (!condition) return [];
  return policies
    .filter((p) => p.applyEnd === null || p.applyEnd >= today)
    .filter((p) => matchesRegion(p, condition) && matchesAge(p, condition.age))
    .sort(compare)
    .map((policy) => ({ policy }));
}
