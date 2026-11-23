import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { SectionBand } from "@/app/_components/section-band";
import { LoadError, Loading } from "@/app/_components/states";
import { dotDate, groupByMonth, type HistoryResult } from "@/knowledge/history";
import { createClient, currentUserId } from "@/lib/supabase/server";
import { KNOWLEDGE_TABS } from "../tabs";
import styles from "../knowledge.module.css";

export const metadata = { title: "처리 기록 | AI 도우미 | HomeFit AI" };

const RESULT_TEXT: Record<HistoryResult, string> = { approved: "승인함", rejected: "거절함" };
const PAGE = 20;
const MAX = 200;

type Filter = HistoryResult | null;

function readFilter(value: unknown): Filter {
  return value === "approved" || value === "rejected" ? value : null;
}

function readCount(value: unknown): number {
  const n = Number(value);
  return Number.isInteger(n) && n > PAGE ? Math.min(n, MAX) : PAGE;
}

function href(filter: Filter, n = PAGE): string {
  const q = new URLSearchParams();
  if (filter) q.set("result", filter);
  if (n > PAGE) q.set("n", String(n));
  const s = q.toString();
  return s ? `/knowledge/history?${s}` : "/knowledge/history";
}

// 처리 기록: 끝난 알림(승인·거절). 내 것만, 로그인 사용자 권한(RLS)으로 읽는다
async function History({ searchParams }: { searchParams: PageProps<"/knowledge/history">["searchParams"] }) {
  await connection();
  const params = await searchParams;
  const filter = readFilter(params.result);
  const n = readCount(params.n);
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const supabase = await createClient();
  const count = (status: HistoryResult) => supabase.from("incidents").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", status);
  const [list, approved, rejected] = await Promise.all([
    supabase.from("incidents").select("id, status, facts, closed_at").eq("user_id", userId)
      .in("status", filter ? [filter] : ["approved", "rejected"]).order("closed_at", { ascending: false }).limit(n + 1),
    count("approved"),
    count("rejected"),
  ]);
  if (list.error || approved.error || rejected.error) return <LoadError>처리 기록을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  const counts = { approved: approved.count ?? 0, rejected: rejected.count ?? 0 };
  if (counts.approved + counts.rejected === 0) return <EmptyHistory />;
  const rows = list.data.slice(0, n).map((row) => ({
    id: row.id, result: row.status as HistoryResult, closedAt: row.closed_at, title: (row.facts as { title?: string }).title ?? "알림",
  }));
  const chips: [Filter, string][] = [[null, `전체 ${counts.approved + counts.rejected}건`], ["approved", `승인함 ${counts.approved}건`], ["rejected", `거절함 ${counts.rejected}건`]];
  return (
    <section className={styles.logCard} aria-label="처리 기록">
      <nav className={styles.chips} aria-label="처리 결과로 거르기">
        {chips.map(([f, label]) => (
          <Link key={label} href={href(f)} scroll={false} className={`${styles.chip} ${f === filter ? styles.chipOn : ""}`} aria-current={f === filter ? "page" : undefined}>{label}</Link>
        ))}
      </nav>
      {groupByMonth(rows).map((group) => (
        <div key={group.label}>
          <h2 className={styles.monthTitle}>{group.label}</h2>
          <ul>
            {group.rows.map((row) => (
              <li key={row.id} className={styles.logRow}>
                <span className={styles.logDate}>{row.closedAt ? dotDate(row.closedAt).slice(5) : "-"}</span>
                <Link href={`/incidents/${row.id}`} className={styles.logTitle}>{row.title}</Link>
                <b className={row.result === "approved" ? styles.approved : styles.rejected}>{RESULT_TEXT[row.result]}</b>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {list.data.length > n && n < MAX ? (
        <div className={styles.more}><Link href={href(filter, n + PAGE)} scroll={false} className={styles.moreButton}>더 보기</Link></div>
      ) : null}
    </section>
  );
}

/** v2-know-log-empty-pc */
function EmptyHistory() {
  return (
    <section className={styles.stateCard}>
      <div className={styles.stateBody}>
        <span className={styles.tag}>비어 있음</span>
        <h2 className={styles.stateTitleLg}>아직 처리한 알림이 없습니다</h2>
        <p className={styles.stateText}>알림을 승인하거나 거절하면 여기에 쌓입니다.</p>
        <Link href="/incidents" className={`${styles.textLink} ${styles.stateLink}`}>알림 보기</Link>
      </div>
    </section>
  );
}

// IA KN_050100_TB 처리 기록 (spec 004, spec 022 FR-011 캔버스 v2-know-log-pc). 낱말로 찾기는 기록 찾기 탭(spec 005 FR-006)
export default function KnowledgeHistoryPage({ searchParams }: PageProps<"/knowledge/history">) {
  return (
    <>
      <SectionBand title="AI 도우미" tabs={KNOWLEDGE_TABS} label="AI 도우미 탭" />
      <main className={styles.main}>
        {/* 주소 값(거르기·더 보기)은 Suspense 안에서 읽는다(cacheComponents) */}
        <Suspense fallback={<Loading />}>
          <History searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}
