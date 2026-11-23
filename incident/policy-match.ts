import { TARGET_GROUPS, TARGET_WORDS, type TargetGroup } from "@/incident/match";
import type { Policy } from "@/watch/youth-policy";

/** 정책을 거르는 데 쓰는 조건 칸만. ERD policy_conditions */
export type PolicyFilter = { sidoCode: string; sigunguCode: string | null; age: number | null };

/** sameName: 이름이 같아 한 줄로 묶인 정책 수(지역마다 따로 올라온 같은 정책, 사용자 요청 2026-11-18) */
export type MatchedPolicy = { policy: Policy; sameName: number };

/** 종류 거르기 (사용자 요청 2026-11-18 "주거인지 대출인지"). 온통청년 중분류와 이름·키워드 낱말로 읽는다 */
export const POLICY_KINDS = ["loan", "rent", "housing", "dormitory"] as const;
export type PolicyKind = (typeof POLICY_KINDS)[number];
export const POLICY_KIND_LABELS: Record<PolicyKind, string> = { loan: "대출·이자", rent: "월세·전세 지원", housing: "주택·거주", dormitory: "기숙사" };
const LOAN_WORDS = ["대출", "이자"];

export function policyKinds(policy: Pick<Policy, "title" | "supplyType" | "keywords">): PolicyKind[] {
  const words = [policy.title, ...(policy.keywords ?? [])].join(" ");
  const middle = policy.supplyType ?? "";
  const found = new Set<PolicyKind>();
  if (LOAN_WORDS.some((word) => words.includes(word))) found.add("loan");
  if (middle.includes("전월세")) found.add("rent");
  if (middle.includes("주택 및 거주지")) found.add("housing");
  if (middle.includes("기숙사")) found.add("dormitory");
  return POLICY_KINDS.filter((kind) => found.has(kind));
}

// spec 022(v2-s3b-filter-pc): 대상 칩. 공고와 같은 대상 낱말(GLOSSARY 대상)을 정책 글에서 찾는다. 자격 판정이 아니라 목록 거르기다
function policyText(policy: Pick<Policy, "title" | "keywords" | "extraQualification">): string {
  return [policy.title, ...(policy.keywords ?? []), policy.extraQualification ?? ""].join(" ");
}

/** 대상을 고르지 않으면 모두 맞음. 고르면 그 대상 낱말이 하나라도 있는 정책만 */
export function matchesPolicyTargets(policy: Pick<Policy, "title" | "keywords" | "extraQualification">, groups: readonly TargetGroup[]): boolean {
  if (groups.length === 0) return true;
  const text = policyText(policy);
  return groups.some((group) => TARGET_WORDS[group].some((word) => text.includes(word)));
}

/** 대상 칸의 "N건" */
export function policyTargetCounts(policies: readonly Pick<Policy, "title" | "keywords" | "extraQualification">[]): Record<TargetGroup, number> {
  const counts = Object.fromEntries(TARGET_GROUPS.map((g) => [g, 0])) as Record<TargetGroup, number>;
  for (const policy of policies) for (const group of TARGET_GROUPS) if (matchesPolicyTargets(policy, [group])) counts[group] += 1;
  return counts;
}

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
// 시군구 거의 전부(2026-11-18 응답 247~256곳)를 적은 정책은 전국용으로 본다 (정책 화면과 같은 기준)
export const NATIONWIDE = 200;

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
export function listMatchedPolicies({ policies, condition, today, kind }: {
  policies: readonly Policy[]; condition: PolicyFilter | null; today: string; kind?: PolicyKind;
}): MatchedPolicy[] {
  if (!condition) return [];
  const matched = policies
    .filter((p) => p.applyEnd === null || p.applyEnd >= today)
    .filter((p) => matchesRegion(p, condition) && matchesAge(p, condition.age))
    .filter((p) => !kind || policyKinds(p).includes(kind));
  return groupSameName(matched, condition).sort((a, b) => compare(a.policy, b.policy));
}

// 같은 정책을 시도·시군구마다 따로 올린다(예: "전세보증금반환보증 보증료 지원" 7건). 띄어쓰기를 빼고 이름으로 묶는다
function nameKey(policy: Policy): string {
  return policy.title.replace(/\s+/g, "");
}

// 묶음에서 보일 하나: 내 지역용(전국이 아닌 것) → 마감이 늦은 것(상시는 가장 늦음) → 최근 등록(ID가 큰 것)
function better(a: Policy, b: Policy, filter: PolicyFilter): Policy {
  const local = (p: Policy) => p.regionCodes.length > 0 && p.regionCodes.length < NATIONWIDE && matchesRegion(p, filter);
  if (local(a) !== local(b)) return local(a) ? a : b;
  const end = (p: Policy) => p.applyEnd ?? "9999-12-31";
  if (end(a) !== end(b)) return end(a) > end(b) ? a : b;
  return a.externalId > b.externalId ? a : b;
}

function groupSameName(policies: readonly Policy[], filter: PolicyFilter): MatchedPolicy[] {
  const groups = new Map<string, MatchedPolicy>();
  for (const policy of policies) {
    const key = nameKey(policy);
    const seen = groups.get(key);
    groups.set(key, seen ? { policy: better(seen.policy, policy, filter), sameName: seen.sameName + 1 } : { policy, sameName: 1 });
  }
  return [...groups.values()];
}
