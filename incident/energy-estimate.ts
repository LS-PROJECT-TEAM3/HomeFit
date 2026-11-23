// spec 011 FR-001·FR-003: 시군구 가구 평균 전력사용량으로 추정, 12개월 예상 요금. 순수 함수
import { aptEnergyCost } from "@/watch/apt-energy";
import { panelFactor, panelMonthlyKwh } from "./energy-panel";
import type { HousingType } from "./home-form";
import { electricityBill, RATE_TABLE } from "./real-cost";

/** spec 011 E2: 한전 시군구 가구 평균(kWh/월)이 없거나 0 이하·숫자가 아니면 추정하지 않는다 */
export function householdAverageKwh(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

export type MonthlyBill = { month: number; bill: number };

/** spec 011 FR-003, E4: 같은 사용량에 달마다 요금표(7·8월 하계 구간)를 적용 */
export function yearlyBills(kwh: number): MonthlyBill[] {
  return Array.from({ length: 12 }, (_, i) => ({ month: i + 1, bill: electricityBill(kwh, i + 1) }));
}

type NeedsEstimate = { sigunguCode: string; energyCost: number | null; electricityKwh: number | null };

/** spec 011 E1: 직접 입력도 kWh도 없는 집의 시군구만, 겹치지 않게(한 번씩만 부른다) */
export function sigungusNeedingEstimate(homes: readonly NeedsEstimate[]): string[] {
  return [...new Set(homes.filter((h) => h.energyCost === null && h.electricityKwh === null).map((h) => h.sigunguCode))];
}

/** 추정 기준: 한전 시군구 평균 × 보정, 또는 패널 전국 평균 × 보정(spec 017 FR-002) */
export type EstimateBasisKind = "kepco" | "national";
type EstimateTarget = { sigunguCode: string; housingType: HousingType; exclusiveAreaM2: number | null };

/** spec 018 E5: 입력·kWh가 없는 아파트 중 면적이 있는 집의 시군구만, 겹치지 않게 */
export function sigungusNeedingAptEstimate(homes: readonly (NeedsEstimate & { housingType?: HousingType; exclusiveAreaM2?: number | null })[]): string[] {
  const targets = homes.filter((h) => h.housingType === "apartment" && typeof h.exclusiveAreaM2 === "number" && h.energyCost === null && h.electricityKwh === null);
  return [...new Set(targets.map((h) => h.sigunguCode))];
}

/**
 * spec 011 FR-002 → spec 017 FR-002 → spec 018: 그 집에 추정값을 붙인다(쓸지는 realCost가 E1 순서로 정한다).
 * kWh: 한전 시군구 평균이 있으면 그 값, 없으면 패널 전국 평균에 주택 종류·면적 비율을 곱한다(spec 017 E4).
 * 금액: 아파트이고 면적이 있고 그 시군구 아파트 평균(원/㎡)이 있으면 × 면적(spec 018 FR-001)
 */
export function withEstimate<T extends EstimateTarget>(
  home: T, averages: ReadonlyMap<string, { kwh: number }>, aptAverages: ReadonlyMap<string, { perM2: number }> = new Map(),
): T & { estimatedKwh: number; estimateBasis: EstimateBasisKind; estimatedEnergyCost: number | null } {
  const kepco = householdAverageKwh(averages.get(home.sigunguCode)?.kwh);
  const base = kepco ?? panelMonthlyKwh();
  const kwh = Math.round(base * panelFactor(home.housingType, home.exclusiveAreaM2) * 10) / 10; // E5
  const apt = home.housingType === "apartment" && home.exclusiveAreaM2 !== null ? aptAverages.get(home.sigunguCode) : undefined;
  return {
    ...home, estimatedKwh: kwh, estimateBasis: kepco === null ? "national" : "kepco",
    estimatedEnergyCost: apt && home.exclusiveAreaM2 !== null ? aptEnergyCost(apt.perM2, home.exclusiveAreaM2) : null,
  };
}

export type HomeUsage = { kwh: number; kind: "input" | "estimated" };

/** spec 011 FR-003: 에너지 분석의 한 달 사용량. 내가 넣은 kWh > 시군구 평균 추정 > 없음(E1) */
export function homeUsage(home: { electricityKwh: number | null; estimatedKwh: number | null }): HomeUsage | null {
  // 0kWh도 입력값(입력 칸이 0~3000을 받고, 집 비교 realCost도 0을 계산한다)
  if (home.electricityKwh !== null) return { kwh: home.electricityKwh, kind: "input" };
  const estimated = householdAverageKwh(home.estimatedKwh);
  return estimated === null ? null : { kwh: estimated, kind: "estimated" };
}

/** spec 011 FR-003 그래프: 사용량이 몇 번째 누진 구간인지와 그 달의 경계(spec 009 요금표, 7·8월 하계) */
export function usageTier(kwh: number, month: number): { tier: 1 | 2 | 3; limits: readonly [number, number] } {
  const limits = month === 7 || month === 8 ? RATE_TABLE.limits.summer : RATE_TABLE.limits.other;
  const [first, second] = limits;
  return { tier: kwh <= first ? 1 : kwh <= second ? 2 : 3, limits: [first, second] };
}

/** 막대 그래프 높이: 가장 큰 값을 maxHeight로 맞춘 비례(원 단위 반올림 없이) */
export function barHeights(values: readonly number[], maxHeight: number): number[] {
  const max = Math.max(0, ...values);
  return values.map((v) => (max === 0 ? 0 : (v / max) * maxHeight));
}

export type ElectricityBreakdown = {
  bill: number; vat: number; total: number;
  tier: 1 | 2 | 3; limits: readonly [number, number];
  /** 다음 구간까지 남은 kWh. 3구간이면 null */
  toNext: number | null;
  /** 지금 구간의 kWh당 요금(원, 반올림) */
  pricePerKwh: number;
  /** 30kWh 줄이면 한 달 덜 나오는 돈(부가세 포함) */
  save30: number;
};

const VAT = 0.1;
const withVat = (bill: number) => bill + Math.round(bill * VAT);

/**
 * spec 022 FR-012(에너지 분석 보드): 이번 달 예상 전기요금(부가세 10% 포함, 기금·기후환경·연료비조정 요금 제외)과 누진 구간 정보.
 * 요금은 spec 009 요금표(electricityBill) 그대로
 */
export function electricityBreakdown(kwh: number, month: number): ElectricityBreakdown {
  const bill = electricityBill(kwh, month);
  const vat = Math.round(bill * VAT);
  const { tier, limits } = usageTier(kwh, month);
  return {
    bill, vat, total: bill + vat, tier, limits,
    toNext: tier === 3 ? null : Math.round((limits[tier - 1] - kwh) * 10) / 10,
    pricePerKwh: Math.round(RATE_TABLE.perKwh[tier - 1]),
    save30: bill + vat - withVat(electricityBill(Math.max(0, kwh - 30), month)),
  };
}
