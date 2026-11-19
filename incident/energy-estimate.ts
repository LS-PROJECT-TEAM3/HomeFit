// spec 011 FR-001·FR-003: 시군구 가구 평균 전력사용량으로 추정, 12개월 예상 요금. 순수 함수
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

/** spec 011 FR-002: 시군구 평균이 있으면 그 집에 추정 kWh를 붙인다(쓸지는 realCost가 E1 순서로 정한다) */
export function withEstimate<T extends { sigunguCode: string }>(home: T, averages: ReadonlyMap<string, { kwh: number }>): T & { estimatedKwh: number | null } {
  return { ...home, estimatedKwh: averages.get(home.sigunguCode)?.kwh ?? null };
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
