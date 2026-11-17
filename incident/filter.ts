// FR-008 (spec 001): 사건 목록 거르기 값. 주소의 쿼리에서 읽어 새로고침해도 유지된다

export const STATUS_FILTERS = ["all", "new", "pending", "approved", "rejected"] as const;
export const PERIOD_FILTERS = ["all", "7d", "30d"] as const;

export type StatusFilter = (typeof STATUS_FILTERS)[number];
export type PeriodFilter = (typeof PERIOD_FILTERS)[number];
export type IncidentFilter = { status: StatusFilter; period: PeriodFilter };

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function pick<T extends string>(allowed: readonly T[], value: string, fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function parseIncidentFilter(params: SearchParams): IncidentFilter {
  return {
    status: pick(STATUS_FILTERS, first(params.status), "all"),
    period: pick(PERIOD_FILTERS, first(params.period), "all"),
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** 기간 시작 시각(ISO). 전체 기간이면 null. @param now 현재 시각 */
export function periodStart(period: PeriodFilter, now: Date): string | null {
  if (period === "all") return null;
  const days = period === "7d" ? 7 : 30;
  return new Date(now.getTime() - days * DAY_MS).toISOString();
}
