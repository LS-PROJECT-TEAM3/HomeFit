import type { ContractType, HousingType } from "@/incident/home-form";
import type { Trade } from "@/watch/rtms";

// spec 008 FR-003~005: 주변 전월세 시세 비교. 순수 함수 [문제정의 사건 기준 표 주변 전월세 시세 변화]

/**
 * 임시 값 한곳 (문제정의 확인 필요 9, spec 008 Q1, Intent 5절).
 * minTrades 5: 사용자 결정 2026-11-18. changeTenths 1 = 10%. areaTolerance ±20%
 */
export const RENT_RULES = { minTrades: 5, changeTenths: 1, areaTolerance: 0.2 } as const;

export type CompareBasis = { sigunguCode: string; housingType: HousingType; areaM2: number; contractType: ContractType };

export type RentField = "monthlyRent" | "deposit";
/** percent: (중간값 - 기준) / 기준 × 100, 소수 첫째 자리 */
export type RentDiff = { field: RentField; base: number; median: number; percent: number };

export type RentSummary = {
  enough: boolean; count: number; medianRent: number | null; medianDeposit: number | null; areaMin: number; areaMax: number;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function areaRange(areaM2: number): { areaMin: number; areaMax: number } {
  return { areaMin: round2(areaM2 * (1 - RENT_RULES.areaTolerance)), areaMax: round2(areaM2 * (1 + RENT_RULES.areaTolerance)) };
}

/** FR-003: 같은 시군구·유형·계약 형태, 면적 ±20%(경계 포함, E9) */
export function selectTrades(trades: readonly Trade[], basis: CompareBasis): Trade[] {
  const { areaMin, areaMax } = areaRange(basis.areaM2);
  return trades.filter((t) =>
    t.sigunguCode === basis.sigunguCode && t.housingType === basis.housingType && t.contractType === basis.contractType
    && t.areaM2 >= areaMin && t.areaM2 <= areaMax);
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function summarize(trades: readonly Trade[], basis: CompareBasis): RentSummary {
  const picked = selectTrades(trades, basis);
  return {
    enough: picked.length >= RENT_RULES.minTrades, count: picked.length, ...areaRange(basis.areaM2),
    medianRent: basis.contractType === "monthly" ? median(picked.map((t) => t.monthlyRent)) : null,
    medianDeposit: median(picked.map((t) => t.deposit)),
  };
}

// E2: 정확히 10%도 넘은 것으로 본다. 부동소수 오차를 피하려 정수로 비교한다
function diff(field: RentField, base: number | null, value: number | null): RentDiff[] {
  if (base === null || base <= 0 || value === null) return [];
  if (Math.abs(value - base) * 10 < base * RENT_RULES.changeTenths) return [];
  return [{ field, base, median: value, percent: Math.round(((value - base) / base) * 1000) / 10 }];
}

/** 사용자 결정(2026-11-18): 월세 계약은 월세와 보증금을 따로 비교한다(E3). 전세는 보증금만 */
function diffs(summary: RentSummary, contractType: ContractType, base: { rent: number | null; deposit: number | null }): RentDiff[] {
  if (!summary.enough) return [];
  const rent = contractType === "monthly" ? diff("monthlyRent", base.rent, summary.medianRent) : [];
  return [...rent, ...diff("deposit", base.deposit, summary.medianDeposit)];
}

export type HomeComparison = RentSummary & { diffs: RentDiff[] };

/** FR-004 (문제정의 기준 (가)): 내 계약 금액 대비 주변 중간값 */
export function compareHome(home: CompareBasis & { deposit: number; monthlyRent: number }, trades: readonly Trade[]): HomeComparison {
  const summary = summarize(trades, home);
  return { ...summary, diffs: diffs(summary, home.contractType, { rent: home.monthlyRent, deposit: home.deposit }) };
}

export type AreaComparison = RentSummary & { diffs: RentDiff[]; next: { rent: number | null; deposit: number | null } | null };

/**
 * FR-005 (문제정의 기준 (나)): 지난번 본 중간값 대비. 처음 본 달은 값만 다음 기준으로(E5).
 * 거래가 부족하면 지난번 값을 그대로 둔다(next null)
 */
export function compareArea(area: CompareBasis & { lastMedianRent: number | null; lastMedianDeposit: number | null }, trades: readonly Trade[]): AreaComparison {
  const summary = summarize(trades, area);
  if (!summary.enough) return { ...summary, diffs: [], next: null };
  return {
    ...summary,
    diffs: diffs(summary, area.contractType, { rent: area.lastMedianRent, deposit: area.lastMedianDeposit }),
    next: { rent: summary.medianRent, deposit: summary.medianDeposit },
  };
}
