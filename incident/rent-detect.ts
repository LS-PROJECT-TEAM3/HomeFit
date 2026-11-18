import type { ContractType, HousingType } from "@/incident/home-form";
import { HOUSING_LABELS } from "@/incident/home-form";
import { compareArea, compareHome, type RentDiff, type RentSummary } from "@/incident/rent-compare";
import { reviewDate } from "@/incident/rent-plan";
import type { Trade } from "@/watch/rtms";

// spec 008 FR-004·005: 거래를 읽은 뒤 내 집·관심 지역마다 시세 알림을 만들지 정한다. 순수 함수

export type HomeTarget = {
  homeId: string; userId: string; sigunguCode: string; housingType: HousingType; areaM2: number;
  contractType: ContractType | null; deposit: number | null; monthlyRent: number | null; contractEndDate: string | null;
};
export type AreaTarget = {
  areaId: string; userId: string; sigunguCode: string; housingType: HousingType; areaM2: number; contractType: ContractType;
  lastMedianRent: number | null; lastMedianDeposit: number | null;
};

/** 알림 상세에 그대로 보일 판단 근거(그때 값). AI 글이 덮지 않는다 [PRD FR-15] */
export type RentFacts = RentSummary & {
  kind: "rent"; target: "home" | "interest_area"; title: string;
  sigunguCode: string; housingType: HousingType; contractType: ContractType;
  /** 비교한 거래 기간 [처음 달, 마지막 달] "YYYY-MM" */
  months: [string, string];
  diffs: RentDiff[];
  /** 승인하면 일정 날짜: 내 집은 계약 만료 2달 전, 관심 지역·만료일 없음은 null */
  dueDate: string | null;
};

export type PlannedRentIncident = { userId: string; targetKind: "home" | "interest_area"; targetId: string; dedupKey: string; facts: RentFacts };
export type AreaUpdate = { areaId: string; rent: number | null; deposit: number | null };
/** 관찰값(observations) 한 줄: 대상마다 거래 수·중간값 */
export type RentObserved = { target: string; count: number; medianRent: number | null; medianDeposit: number | null; enough: boolean };

const FIELD_LABELS = { monthlyRent: "월세", deposit: "보증금" } as const;

function title(target: "home" | "interest_area", housingType: HousingType, diff: RentDiff): string {
  const what = `${HOUSING_LABELS[housingType]} ${FIELD_LABELS[diff.field]} 시세가`;
  const size = `${Math.abs(diff.percent)}%`;
  if (target === "home") return `내 집 주변 ${what} 내 계약보다 ${size} ${diff.percent > 0 ? "높습니다" : "낮습니다"}`;
  return `관심 지역 ${what} 지난번보다 ${size} ${diff.percent > 0 ? "올랐습니다" : "내렸습니다"}`;
}

// 가장 많이 바뀐 것으로 제목을 짓는다
function biggest(diffs: RentDiff[]): RentDiff {
  return diffs.reduce((a, b) => (Math.abs(b.percent) > Math.abs(a.percent) ? b : a));
}

type Input = { homes: readonly HomeTarget[]; areas: readonly AreaTarget[]; trades: readonly Trade[]; runYm: string; months: [string, string] };
export type RentPlan = { create: PlannedRentIncident[]; areaUpdates: AreaUpdate[]; observed: RentObserved[] };

function planHome(home: HomeTarget, input: Input, plan: RentPlan): void {
  // E4: 계약 형태·금액이 없으면 비교할 수 없다
  if (!home.contractType || home.deposit === null || (home.contractType === "monthly" && home.monthlyRent === null)) return;
  const basis = { sigunguCode: home.sigunguCode, housingType: home.housingType, areaM2: home.areaM2, contractType: home.contractType };
  const result = compareHome({ ...basis, deposit: home.deposit, monthlyRent: home.monthlyRent ?? 0 }, input.trades);
  const { diffs, ...summary } = result;
  plan.observed.push({ target: `home:${home.homeId}`, ...summary });
  if (diffs.length === 0) return;
  plan.create.push({
    userId: home.userId, targetKind: "home", targetId: home.homeId, dedupKey: `rent:home:${home.homeId}:${input.runYm}`,
    facts: { kind: "rent", target: "home", title: title("home", home.housingType, biggest(diffs)), ...basis, ...summary, months: input.months, diffs, dueDate: reviewDate(home.contractEndDate) },
  });
}

function planArea(area: AreaTarget, input: Input, plan: RentPlan): void {
  const basis = { sigunguCode: area.sigunguCode, housingType: area.housingType, areaM2: area.areaM2, contractType: area.contractType };
  const { diffs, next, ...summary } = compareArea({ ...basis, lastMedianRent: area.lastMedianRent, lastMedianDeposit: area.lastMedianDeposit }, input.trades);
  plan.observed.push({ target: `area:${area.areaId}`, ...summary });
  if (next) plan.areaUpdates.push({ areaId: area.areaId, ...next });
  if (diffs.length === 0) return;
  plan.create.push({
    userId: area.userId, targetKind: "interest_area", targetId: area.areaId, dedupKey: `rent:area:${area.areaId}:${input.runYm}`,
    facts: { kind: "rent", target: "interest_area", title: title("interest_area", area.housingType, biggest(diffs)), ...basis, ...summary, months: input.months, diffs, dueDate: null },
  });
}

/** spec 008 FR-004·005, E6: 같은 대상·같은 달은 dedupKey가 같아 DB 유일 조건이 한 번만 남긴다 */
export function planRentIncidents(input: Input): RentPlan {
  const plan: RentPlan = { create: [], areaUpdates: [], observed: [] };
  for (const home of input.homes) planHome(home, input, plan);
  for (const area of input.areas) planArea(area, input, plan);
  return plan;
}

/** spec 008 FR-002: 부를 시군구 × 주택 유형(대상이 쓰는 것만, 겹치지 않게) */
export function rentTargetKeys(homes: readonly Pick<HomeTarget, "sigunguCode" | "housingType">[], areas: readonly Pick<AreaTarget, "sigunguCode" | "housingType">[]) {
  const keys = new Map<string, { sigunguCode: string; housingType: HousingType }>();
  for (const t of [...homes, ...areas]) keys.set(`${t.sigunguCode}:${t.housingType}`, { sigunguCode: t.sigunguCode, housingType: t.housingType });
  return [...keys.values()];
}
