import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Empty, LoadError, Loading } from "@/app/_components/states";
import { SkeletonNotice } from "@/app/_components/page-status";
import { createClient, currentUserId } from "@/lib/supabase/server";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "AI 도우미 | HomeFit AI" };

const STATUS_TEXT: Record<string, string> = { approved: "승인", rejected: "거절" };

// 처리 기록: 끝난 알림(승인·거절). 내 것만, 로그인 사용자 권한(RLS)으로 읽는다
async function History() {
  await connection();
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const { data, error } = await (await createClient())
    .from("incidents")
    .select("id, status, facts, closed_at")
    .eq("user_id", userId)
    .in("status", ["approved", "rejected"])
    .order("closed_at", { ascending: false })
    .limit(10);
  if (error) return <LoadError>처리 기록을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  if (data.length === 0) return <Empty>아직 처리한 알림이 없습니다. 알림을 승인하거나 거절하면 여기에 쌓입니다.</Empty>;
  return (
    <ul className={styles.list}>
      {data.map((row) => (
        <li key={row.id}>
          <Link href={`/incidents/${row.id}`}>{(row.facts as { title?: string }).title ?? "알림"}</Link>{" "}
          <span className={styles.muted}>· {STATUS_TEXT[row.status] ?? row.status}</span>
        </li>
      ))}
    </ul>
  );
}

// IA KN_050000_PG 기록 찾기 = 기획안 9절 AI Assistant (PRD FR-18, spec 004 뼈대). 질문·답(RAG)은 다음 단계
export default function KnowledgePage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>AI 도우미</h1>
      <SkeletonNotice>
        지난 알림과 처리 기록에서 찾아 답하고 답마다 출처를 보여 주는 기능(PRD FR-18)이 들어올 자리입니다.
        임베딩 방법(ERD Q1)을 정한 뒤 만듭니다. 지금은 처리 기록만 보여 줍니다.
      </SkeletonNotice>
      <form className={styles.form} aria-label="질문 (다음 단계)">
        <div className={styles.field}>
          <label htmlFor="ask">질문</label>
          <input id="ask" className={styles.input} placeholder="예: 지난겨울 결로 알림에 무엇을 했지?" disabled />
        </div>
        <button type="button" className={styles.input} disabled>묻기 (다음 단계)</button>
      </form>
      <section className={styles.section} aria-labelledby="history-title">
        <h2 id="history-title">처리 기록 (최근 10건)</h2>
        <Suspense fallback={<Loading />}>
          <History />
        </Suspense>
      </section>
    </main>
  );
}
