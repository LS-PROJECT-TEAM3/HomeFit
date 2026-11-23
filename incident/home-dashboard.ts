import { RISK_RULES } from "@/incident/condensation";
import type { ContractType } from "@/incident/home-form";

// spec 003 v0.2 FR-010: 홈 카드 5개에 쓰는 계산. 순수 함수(오늘·지금은 인자)

export type HousingCost =
  | { status: "no_contract" }
  | { status: "ok" | "no_fee"; rent: number; fee: number | null; total: number };

/** 월 예상 주거비 = 월세 + 관리비 [GLOSSARY 월 예상 주거비]. 전세면 월세 0 */
export function monthlyHousingCost(input: { contractType: ContractType | null; monthlyRent: number | null; maintenanceFee: number | null }): HousingCost {
  // 5단계 리뷰 3: 계약 형태를 안 골라도 월세가 있으면 계산한다
  const rent = input.contractType === "jeonse" ? 0 : input.monthlyRent;
  if (rent === null) return { status: "no_contract" };
  if (input.maintenanceFee === null) return { status: "no_fee", rent, fee: null, total: rent };
  return { status: "ok", rent, fee: input.maintenanceFee, total: rent + input.maintenanceFee };
}

const DAY_MS = 86_400_000;

function utcDay(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

/** 상태는 색이 아니라 글자로 (디자인 기본선 5) */
export function contractEndText(endDate: string | null, today: string): string | null {
  if (!endDate) return null;
  const days = Math.round((utcDay(endDate) - utcDay(today)) / DAY_MS);
  if (days < 0) return "계약 만료일 지남";
  if (days === 0) return "오늘 계약 만료";
  return `계약 만료까지 ${days}일`;
}

// 1평 = 400/121㎡ → 1㎡ = 0.3025평
export function toPyeong(squareMeters: number): number {
  return Math.round(squareMeters * 0.3025 * 10) / 10;
}

/** Q4: 7일 넘은 측정값은 결로 판단에 쓰지 않는다 */
export function measurementState(measuredAt: string | null, now: Date): "none" | "stale" | "fresh" {
  if (!measuredAt) return "none";
  return now.getTime() - Date.parse(measuredAt) > RISK_RULES.measurementMaxAgeMs ? "stale" : "fresh";
}

const RISK_TYPES = new Set(["humidity_condensation", "rent_price_change"]);

/** [GLOSSARY 사건] 위험 = 습도·결로·시세, 주거 기회 = 공고 변화 */
export function countAlertGroups(rows: readonly { incidentType: string; status: string }[]): { newRisk: number; newOpportunity: number; pending: number } {
  let newRisk = 0;
  let newOpportunity = 0;
  let pending = 0;
  for (const row of rows) {
    if (row.status === "pending") pending += 1;
    if (row.status !== "new") continue;
    if (RISK_TYPES.has(row.incidentType)) newRisk += 1;
    else newOpportunity += 1;
  }
  return { newRisk, newOpportunity, pending };
}

/** 5단계 리뷰 1: 측정값이 없거나 오래돼 판단하지 않았으면 "위험 없음"이라고 하지 않는다 */
export function environmentLine(input: { state: "none" | "stale" | "fresh"; lastCheckAt: string | null }): string {
  if (input.state === "none") return "측정값이 있어야 결로 위험을 판단합니다";
  if (input.state === "stale") return "측정값이 7일 넘어 결로 위험을 판단하지 않았습니다. 새로 재서 넣어 주세요";
  if (!input.lastCheckAt) return "아직 예보를 확인하지 않았습니다";
  return `앞으로 48시간 결로 위험 없음 · 예보 확인 ${input.lastCheckAt}`;
}

const WEEKDAYS = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"] as const;

/** spec 022 FR-011: 홈 다가오는 일정 날짜 칸. "2026-12-05" → { date: "12.05", weekday: "토요일" } */
export function scheduleDateParts(dueDate: string | null): { date: string; weekday: string } | null {
  if (!dueDate) return null;
  const [, month, day] = dueDate.split("-");
  return { date: `${month}.${day}`, weekday: WEEKDAYS[new Date(utcDay(dueDate)).getUTCDay()] };
}
