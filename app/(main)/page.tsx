import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoadError, Loading } from "@/app/_components/states";
import { describeDeadline } from "@/incident/checklist";
import { listMyMatchedNotices } from "@/incident/notices.server";
import { countOpenIncidents } from "@/incident/queries.server";
import { listSchedule } from "@/incident/schedule.server";
import { currentUserId } from "@/lib/supabase/server";
import { loadMyCondition } from "./my/conditions/load";
import { toKstDate } from "@/watch/kst";
import styles from "./page.module.css";

async function Dashboard() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  let data;
  try {
    const [counts, schedule, condition, matched] = await Promise.all([
      countOpenIncidents(), listSchedule(3), loadMyCondition(userId), listMyMatchedNotices(toKstDate(new Date())),
    ]);
    data = { counts, schedule, condition, openMatched: matched.items.filter((item) => !item.expired).length };
  } catch {
    return <LoadError>사건을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  const today = toKstDate(new Date());
  const { counts, schedule, condition, openMatched } = data;
  return (
    <div className={styles.bento}>
      {condition ? null : (
        <Link href="/onboarding" className={`${styles.card} ${styles.wide} ${styles.callout}`}>
          <strong>조건을 입력해 주세요</strong>
          <span>지역과 임대료 상한을 넣으면 맞는 공고를 보여 주고, 그 공고가 바뀌면 사건으로 알려 드립니다.</span>
        </Link>
      )}
      <Link href="/incidents?status=new" className={styles.card}>
        <span className={styles.cardLabel}>새 사건</span>
        <span className={`${styles.number} tabular-nums`}>{counts.newCount}</span>
      </Link>
      <Link href="/incidents?status=pending" className={styles.card}>
        <span className={styles.cardLabel}>승인 대기</span>
        <span className={`${styles.number} tabular-nums`}>{counts.pendingCount}</span>
      </Link>
      {/* FR-007·FR-017 (spec 001 v0.2): 맞는 공고 수는 사건과 따로 */}
      <Link href="/notices" className={styles.card}>
        <span className={styles.cardLabel}>맞는 공고(마감 전)</span>
        <span className={`${styles.number} tabular-nums`}>{openMatched}</span>
      </Link>
      <section className={`${styles.card} ${styles.wide}`} aria-labelledby="upcoming">
        <h2 id="upcoming" className={styles.cardLabel}>다가오는 일정</h2>
        {schedule.length === 0 ? (
          <p className={styles.muted}>{counts.newCount + counts.pendingCount > 0 ? "사건을 승인하면 여기에 일정이 생깁니다." : "아직 사건이 없습니다."}</p>
        ) : (
          <ul className={styles.list}>
            {schedule.map((item) => (
              <li key={item.id}>
                <Link href={`/schedule/${item.id}`}>{item.title}</Link>{" "}
                <span className={styles.muted}>{describeDeadline(item.dueDate, today) ?? "마감일: 공고문 확인"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// IA HM_000000_PG 홈 (FR-007, spec 001). 벤토 카드, 숫자를 누르면 그 목록으로
export default function HomePage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>홈</h1>
      <Suspense fallback={<Loading />}>
        <Dashboard />
      </Suspense>
    </main>
  );
}
