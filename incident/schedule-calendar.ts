// spec 022(캔버스 v2-s7-pc): 내 일정 달력과 다가오는 일정. 날짜는 한국 날짜 "YYYY-MM-DD". 순수 함수
export type ScheduleKind = "prepare" | "risk";
export type CalendarSource = { id: string; title: string; kind: ScheduleKind; checklist: readonly { label: string; dueOn: string | null; done: boolean }[] };
export type CalendarEvent = { date: string; label: string; done: boolean; kind: ScheduleKind; scheduleId: string; index: number; planTitle: string };

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** 주소 ?month=2026-12. 틀리면 오늘이 있는 달 */
export function readMonth(value: string | undefined, today: string): string {
  return value && MONTH.test(value) ? value : today.slice(0, 7);
}

export function shiftMonth(month: string, by: 1 | -1): string {
  const [y, m] = month.split("-").map(Number);
  return iso(new Date(Date.UTC(y, m - 1 + by, 1))).slice(0, 7);
}

/** 일요일 시작 주 묶음. 앞뒤 달 날짜로 칸을 채운다 */
export function monthGrid(month: string): string[][] {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());
  const last = new Date(Date.UTC(y, m, 0));
  const weeks: string[][] = [];
  for (const d = new Date(start); d <= last || d.getUTCDay() !== 0; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() === 0) weeks.push([]);
    weeks[weeks.length - 1].push(iso(d));
  }
  return weeks;
}

/** 날짜 있는 할 일을 날짜 순으로 */
export function scheduleEvents(items: readonly CalendarSource[]): CalendarEvent[] {
  return items
    .flatMap((item) => item.checklist.map((c, index) => ({ date: c.dueOn, label: c.label, done: c.done, kind: item.kind, scheduleId: item.id, index, planTitle: item.title })))
    .filter((e): e is CalendarEvent => e.date !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** 오늘부터, 끝내지 않은 할 일 limit개 */
export function upcoming(events: readonly CalendarEvent[], today: string, limit: number): CalendarEvent[] {
  return events.filter((e) => !e.done && e.date >= today).slice(0, limit);
}
