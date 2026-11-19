// spec 013 FR-001~003: 내 일정 맨 위 "계약 만료 알림". 저장하지 않고 만료일과 오늘(한국 날짜)로 계산한다. 순수 함수

const DAY_MS = 86_400_000;
const REMINDER_MONTHS = 2; // PRD FR-31 "만료 2달 전"

export type ContractReminder = {
  state: "upcoming" | "today" | "past";
  endDate: string;
  /** 오늘부터 만료일까지 날 수. 지났으면 음수 */
  daysLeft: number;
  label: string;
};

/** "YYYY-MM-DD"를 UTC 자정 시각으로. 없는 날짜(2월 30일 등)면 null */
function parseDate(date: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const value = new Date(Date.UTC(year, month - 1, day));
  return value.getUTCMonth() === month - 1 && value.getUTCDate() === day ? value : null;
}

const format = (value: Date): string => value.toISOString().slice(0, 10);

/** E5: 만료일 2달 전. 그 달에 같은 날이 없으면 그 달 마지막 날 */
export function reminderStartDate(endDate: string): string | null {
  const end = parseDate(endDate);
  if (!end) return null;
  const targetMonth = end.getUTCMonth() - REMINDER_MONTHS;
  const lastDay = new Date(Date.UTC(end.getUTCFullYear(), targetMonth + 1, 0)).getUTCDate();
  return format(new Date(Date.UTC(end.getUTCFullYear(), targetMonth, Math.min(end.getUTCDate(), lastDay))));
}

/**
 * @param endDate 내 집 계약 만료일 (ERD homes.contract_end_date)
 * @param today 한국 날짜 "YYYY-MM-DD"
 */
export function contractReminder(endDate: string | null, today: string): ContractReminder | null {
  if (!endDate) return null; // E1
  const end = parseDate(endDate);
  const start = reminderStartDate(endDate);
  const now = parseDate(today);
  if (!end || !start || !now || today < start) return null; // E2
  const daysLeft = Math.round((end.getTime() - now.getTime()) / DAY_MS);
  if (daysLeft < 0) return { state: "past", endDate, daysLeft, label: "계약 만료일 지남" }; // E4, FR-003
  if (daysLeft === 0) return { state: "today", endDate, daysLeft, label: "오늘 계약 만료" }; // E3
  return { state: "upcoming", endDate, daysLeft, label: `계약 만료까지 ${daysLeft}일` };
}
