// spec 022(캔버스 v2-s6-pc DS PlanStep): 알림 상세 계획 줄. 날짜 "12.05"·요일, 공고 마감일과 같은 날은 마감. 순수 함수
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export type PlanStepView = { date: string; weekday: string; title: string; deadline: boolean };

const short = (date: string) => date.slice(5).replace("-", ".");

/** deadlineOn: 공고 마감일(주거 기회 알림). 없으면 마감 표시 없음 */
export function planSteps(items: readonly { label: string; dueOn: string | null }[], deadlineOn: string | null): { steps: PlanStepView[]; range: string } {
  const steps = items.map((item) => item.dueOn
    ? { date: short(item.dueOn), weekday: WEEKDAYS[new Date(`${item.dueOn}T00:00:00Z`).getUTCDay()], title: item.label, deadline: item.dueOn === deadlineOn }
    : { date: "날짜 없음", weekday: "", title: item.label, deadline: false });
  const dates = items.map((i) => i.dueOn).filter((d): d is string => d !== null).sort();
  const range = dates.length === 0 ? "" : dates[0] === dates.at(-1) ? short(dates[0]) : `${short(dates[0])} ~ ${short(dates.at(-1) as string)}`;
  return { steps, range };
}
