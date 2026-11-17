import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoadError, Loading } from "@/app/_components/states";
import { describeDeadline } from "@/incident/checklist";
import { getScheduleItem, type ScheduleItem } from "@/incident/schedule.server";
import { toKstDate } from "@/watch/kst";
import { Checklist } from "./checklist";
import styles from "../schedule.module.css";

export const metadata = { title: "일정 상세 | HomeFit AI" };

async function Item({ params }: { params: PageProps<"/schedule/[id]">["params"] }) {
  const { id } = await params;
  await connection();
  let item: ScheduleItem | null;
  try {
    item = await getScheduleItem(id);
  } catch {
    return <LoadError>일정을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  if (!item) return <LoadError>볼 수 없는 페이지입니다. <Link href="/schedule">내 일정으로</Link></LoadError>;
  return (
    <>
      <h1 className={styles.title}>{item.title}</h1>
      <p className={styles.meta}>
        마감: {item.dueDate ?? "마감일 없음"} {describeDeadline(item.dueDate, toKstDate(new Date())) ? `· ${describeDeadline(item.dueDate, toKstDate(new Date()))}` : ""}
      </p>
      <Checklist scheduleId={item.id} items={item.checklist} />
      <p><Link href={`/incidents/${item.incidentId}`}>출처 알림 보기</Link></p>
    </>
  );
}

// IA SC_060100_PG 일정 상세 (FR-013, spec 001)
export default function ScheduleItemPage({ params }: PageProps<"/schedule/[id]">) {
  return (
    <main className={styles.main}>
      <p><Link href="/schedule">← 내 일정</Link></p>
      <Suspense fallback={<Loading />}>
        <Item params={params} />
      </Suspense>
    </main>
  );
}
