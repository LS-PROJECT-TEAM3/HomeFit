// FR-008 (spec 001): 사건 목록 거르기 값. 주소의 쿼리에서 읽어 새로고침해도 유지된다
// 사용자 요청(2026-11-23): 기간은 "전체 기간 / 7일 / 30일" 대신 시작일~끝일 날짜(한국 날짜). 7일/30일 버튼은 날짜를 채운다

export const STATUS_FILTERS = ["all", "new", "pending", "approved", "rejected"] as const;

export type StatusFilter = (typeof STATUS_FILTERS)[number];
/** from·to: 한국 날짜 "YYYY-MM-DD". 없으면 그쪽 끝은 열려 있다 */
export type IncidentFilter = { status: StatusFilter; from: string | null; to: string | null };

type SearchParams = Record<string, string | string[] | undefined>;

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function pick<T extends string>(allowed: readonly T[], value: string, fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** 진짜 있는 날짜의 "YYYY-MM-DD"만 */
function dateOrNull(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}

export function parseIncidentFilter(params: SearchParams): IncidentFilter {
  const from = dateOrNull(first(params.from));
  const to = dateOrNull(first(params.to));
  const swap = from !== null && to !== null && from > to;
  return { status: pick(STATUS_FILTERS, first(params.status), "all"), from: swap ? to : from, to: swap ? from : to };
}

/** 한국 날짜 범위 → 조회 경계(ISO, since 이상 until 미만). 끝일은 그날 하루를 다 넣는다 */
export function dateRangeBounds(from: string | null, to: string | null): { since: string | null; until: string | null } {
  const kstMidnight = (date: string) => new Date(Date.parse(`${date}T00:00:00Z`) - KST_OFFSET_MS);
  return {
    since: from ? kstMidnight(from).toISOString() : null,
    until: to ? new Date(kstMidnight(to).getTime() + DAY_MS).toISOString() : null,
  };
}

/** "최근 n일" 버튼이 채울 날짜. 오늘을 넣어 n일(오늘 - (n-1) ~ 오늘). @param today 한국 날짜 */
export function quickRange(days: number, today: string): { from: string; to: string } {
  const from = new Date(Date.parse(`${today}T00:00:00Z`) - (days - 1) * DAY_MS).toISOString().slice(0, 10);
  return { from, to: today };
}
