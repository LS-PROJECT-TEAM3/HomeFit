import { PolicyTabs } from "@/app/_components/policy-tabs";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Empty, LoadError, Loading } from "@/app/_components/states";
import { describeDeadline } from "@/incident/checklist";
import { contractReminder, type ContractReminder } from "@/incident/contract-reminder";
import { listSchedule, type ScheduleItem } from "@/incident/schedule.server";
import { currentUserId } from "@/lib/supabase/server";
import { toKstDate } from "@/watch/kst";
import { loadMyHome } from "../my/home/load";
import { ContractReminderCard } from "./contract-reminder-card";
import styles from "./schedule.module.css";

export const metadata = { title: "내 일정 | HomeFit AI" };

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

function PlanList({ items, today }: { items: ScheduleItem[]; today: string }) {
  return (
    <ul className={styles.list}>
      {items.map((item) => {
        const done = item.checklist.filter((entry) => entry.done).length;
        return (
          <li key={item.id}>
            <Link href={`/schedule/${item.id}`} className={styles.item}>
              <span className={styles.itemTitle}>{item.title}</span>
              <span className={styles.meta}>
                {describeDeadline(item.dueDate, today) ?? "마감일 없음"} · 할 일 {done}/{item.checklist.length}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

async function ScheduleList() {
  await connection();
  const today = toKstDate(new Date());
  const [plans, { reminder, failed }] = await Promise.all([listSchedule().then((items) => items, () => null), loadReminder(today)]);
  const noPlansText = "아직 승인한 계획이 없습니다. 위험·기회 알림에서 계획을 승인하면 여기에 생깁니다.";
  return (
    <>
      {reminder ? <ContractReminderCard reminder={reminder} /> : null}
      {failed ? <LoadError>내 집 계약 정보를 불러오지 못해 계약 만료 알림을 확인하지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError> : null}
      {plans === null ? <LoadError>내 일정을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError> : null}
      {plans !== null && plans.length > 0 ? (
        <section className={styles.group}>
          {reminder ? <h2 className={styles.groupTitle}>승인한 계획</h2> : null}
          <PlanList items={plans} today={today} />
        </section>
      ) : null}
      {/* spec 013 E7: 만료 알림만 있으면 빈 화면 대신 계획 없음 안내만 짧게 */}
      {plans !== null && plans.length === 0 ? (reminder ? <p className={styles.meta}>{noPlansText}</p> : <Empty>{noPlansText}</Empty>) : null}
    </>
  );
}

// IA SC_060000_PG 내 일정 (FR-011, FR-013, spec 001. 계약 만료 알림 spec 013 FR-001)
export default function SchedulePage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>내 일정</h1>
      {/* spec 004 v0.2: 기획안 Work & Policy 탭 */}
      <PolicyTabs />
      <Suspense fallback={<Loading />}>
        <ScheduleList />
      </Suspense>
    </main>
  );
}
