import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Empty, LoadError, Loading } from "@/app/_components/states";
import { describeDeadline } from "@/incident/checklist";
import { listSchedule, type ScheduleItem } from "@/incident/schedule.server";
import { toKstDate } from "@/watch/kst";
import styles from "./schedule.module.css";

export const metadata = { title: "내 일정 | HomeFit AI" };

async function ScheduleList() {
  await connection();
  let items: ScheduleItem[];
  try {
    items = await listSchedule();
  } catch {
    return <LoadError>내 일정을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  if (items.length === 0) return <Empty>아직 일정이 없습니다. 사건에서 신청 준비 계획을 승인하면 여기에 생깁니다.</Empty>;
  const today = toKstDate(new Date());
  return (
    <ul className={styles.list}>
      {items.map((item) => {
        const done = item.checklist.filter((entry) => entry.done).length;
        return (
          <li key={item.id}>
            <Link href={`/schedule/${item.id}`} className={styles.item}>
              <span className={styles.itemTitle}>{item.title}</span>
              <span className={styles.meta}>
                {describeDeadline(item.dueDate, today) ?? "마감일: 공고문 확인"} · 할 일 {done}/{item.checklist.length}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// IA SC_060000_PG 내 일정 (FR-011, FR-013, spec 001)
export default function SchedulePage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>내 일정</h1>
      <Suspense fallback={<Loading />}>
        <ScheduleList />
      </Suspense>
    </main>
  );
}
