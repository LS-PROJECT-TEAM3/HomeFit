import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoadError, Loading } from "@/app/_components/states";
import { describeDeadline } from "@/incident/checklist";
import { getPolicy } from "@/incident/policies.server";
import { POLICY_SOURCE, policyDueText } from "@/incident/policy-schedule";
import { scheduleOrigin } from "@/incident/schedule-origin";
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
  const origin = scheduleOrigin(item); // spec 007 FR-004, spec 026
  // spec 026 FR-004·FR-005: 정책 일정은 원문 제출 서류와 마감 없는 이유(상시/기간 모름). 정책을 못 읽어도 일정은 보인다
  const policy = item.sourceCode === POLICY_SOURCE && item.announcementId ? await getPolicy(item.announcementId).catch(() => null) : null;
  const noDueText = item.sourceCode === POLICY_SOURCE ? policyDueText(item.dueDate, policy?.periodKind ?? null) : null;
  return (
    <>
      <h1 className={styles.title}>{item.title}</h1>
      <p className={styles.meta}>
        마감: {item.dueDate ?? noDueText ?? "마감일 없음"} {describeDeadline(item.dueDate, toKstDate(new Date())) ? `· ${describeDeadline(item.dueDate, toKstDate(new Date()))}` : ""}
      </p>
      <Checklist scheduleId={item.id} items={item.checklist} />
      {item.sourceCode === POLICY_SOURCE ? (
        <section aria-labelledby="policy-docs-title">
          <h2 id="policy-docs-title" className={styles.meta}>정책 원문의 제출 서류</h2>
          {/* 자격·서류는 판정하지 않고 원문 그대로(PRD 9절) */}
          <p className={`${styles.meta} ${styles.preLine}`}>{policy?.documents ?? "공고문 확인"}</p>
        </section>
      ) : null}
      {origin ? <p><Link href={origin.href}>{origin.label}</Link></p> : null}
    </>
  );
}

// IA SC_060100_PG 일정 상세 (FR-013, spec 001, spec 007 FR-004, spec 026 FR-004·FR-005)
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
