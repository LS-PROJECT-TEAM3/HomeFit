import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Icon } from "@/app/_components/icons";
import { LoadError, Loading } from "@/app/_components/states";
import { contractReminder, type ContractReminder } from "@/incident/contract-reminder";
import { monthGrid, readMonth, scheduleEvents, shiftMonth, upcoming, type CalendarEvent } from "@/incident/schedule-calendar";
import { listSchedule, listScheduleKinds } from "@/incident/schedule.server";
import { currentUserId } from "@/lib/supabase/server";
import { toKstDate } from "@/watch/kst";
import { loadMyHome } from "../my/home/load";
import { ContractReminderCard } from "./contract-reminder-card";
import { UpcomingList } from "./upcoming-list";
import styles from "./calendar.module.css";

export const metadata = { title: "내 일정 | HomeFit AI" };

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
const UPCOMING = 7;

type ReminderResult = { reminder: ContractReminder | null; failed: boolean };

// spec 013 E6: 내 집을 못 읽어도 승인한 계획 목록은 그대로 보인다
async function loadReminder(today: string): Promise<ReminderResult> {
  const userId = await currentUserId();
  if (!userId) return { reminder: null, failed: false };
  try {
    const { home } = await loadMyHome(userId);
    return { reminder: contractReminder(home?.contractEndDate ?? null, today), failed: false };
  } catch {
    return { reminder: null, failed: true };
  }
}

/** 칸 날짜 글자: 달의 첫날은 "12.1", 나머지는 "15"(보드) */
const dayLabel = (date: string) => (date.endsWith("-01") ? `${Number(date.slice(5, 7))}.1` : String(Number(date.slice(8))));

function Calendar({ month, events, today }: { month: string; events: CalendarEvent[]; today: string }) {
  const byDate = Map.groupBy(events, (e) => e.date);
  const [y, m] = month.split("-");
  return (
    <section className={styles.calendar} aria-labelledby="cal-title">
      <div className={styles.calHead}>
        <div className={styles.calNav}>
          <Link href={`/schedule?month=${shiftMonth(month, -1)}`} className={styles.navButton} aria-label="이전 달" title="이전 달" scroll={false}><span className={styles.flip}><Icon name="chevron-right" /></span></Link>
          <h2 id="cal-title" className={styles.calTitle}>{y}년 {Number(m)}월</h2>
          <Link href={`/schedule?month=${shiftMonth(month, 1)}`} className={styles.navButton} aria-label="다음 달" title="다음 달" scroll={false}><Icon name="chevron-right" /></Link>
        </div>
        <div className={styles.legend}>
          <span><span className={`${styles.swatch} ${styles.swatchPrepare}`} aria-hidden="true" />신청 준비</span>
          <span><span className={`${styles.swatch} ${styles.swatchRisk}`} aria-hidden="true" />위험 대응</span>
        </div>
      </div>
      <div className={styles.grid} role="grid" aria-labelledby="cal-title">
        <div role="row" className={styles.weekRow}>
          {WEEK.map((d, i) => <span key={d} role="columnheader" className={`${styles.weekday} ${i === 0 ? styles.sunday : ""}`}>{d}</span>)}
        </div>
        {monthGrid(month).map((week) => (
          <div key={week[0]} role="row" className={styles.weekRow}>
            {week.map((date) => {
              const items = byDate.get(date) ?? [];
              const outside = !date.startsWith(month);
              return (
                <div key={date} role="gridcell" className={`${styles.cell} ${date === today ? styles.today : ""}`} aria-label={`${date}${items.length ? `, 할 일 ${items.length}개` : ""}`}>
                  <span className={`${styles.dayNum} ${outside ? styles.outside : ""}`}>{dayLabel(date)}</span>
                  {items.map((e) => (
                    <Link key={`${e.scheduleId}:${e.index}`} href={`/schedule/${e.scheduleId}`} className={`${styles.event} ${e.kind === "risk" ? styles.eventRisk : styles.eventPrepare} ${e.done ? styles.eventDone : ""}`}>
                      <span className={styles.srOnly}>{e.kind === "risk" ? "위험 대응: " : "신청 준비: "}</span>{e.label}{e.done ? <span className={styles.srOnly}> (끝냄)</span> : null}
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

async function ScheduleBody({ searchParams }: { searchParams: PageProps<"/schedule">["searchParams"] }) {
  await connection();
  const today = toKstDate(new Date());
  const raw = (await searchParams).month;
  const month = readMonth(typeof raw === "string" ? raw : undefined, today);
  const [plans, { reminder, failed }] = await Promise.all([listSchedule().then((items) => items, () => null), loadReminder(today)]);
  if (plans === null) return <LoadError>내 일정을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  const kinds = await listScheduleKinds(plans).catch(() => new Map());
  const events = scheduleEvents(plans.map((p) => ({ id: p.id, title: p.title, kind: kinds.get(p.id) ?? "prepare", checklist: p.checklist })));
  const deadlines = plans.filter((p) => p.dueDate).map((p) => `${p.id}:${p.dueDate}`);
  return (
    <div className={styles.layout}>
      <Calendar month={month} events={events} today={today} />
      <aside className={styles.side}>
        {reminder ? <ContractReminderCard reminder={reminder} /> : null}
        {failed ? <LoadError>내 집 계약 정보를 불러오지 못해 계약 만료 알림을 확인하지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError> : null}
        <section className={styles.upcomingCard} aria-labelledby="upcoming-title">
          <h2 id="upcoming-title" className={styles.upTitleHead}>다가오는 일정</h2>
          <UpcomingList events={upcoming(events, today, UPCOMING)} deadlines={deadlines} />
        </section>
      </aside>
    </div>
  );
}

// IA SC_060000_PG 내 일정 (FR-011, FR-013, spec 001. 계약 만료 알림 spec 013 FR-001, spec 022 캔버스 v2-s7-pc). 옛 "청년 정책" 탭은 뺐다(위쪽 메뉴에 있음)
export default function SchedulePage({ searchParams }: PageProps<"/schedule">) {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>내 일정</h1>
      <span className={styles.titleLine} aria-hidden="true" />
      <Suspense fallback={<Loading />}>
        <ScheduleBody searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
