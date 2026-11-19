import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Empty, LoadError, Loading } from "@/app/_components/states";
import { createClient, currentUserId } from "@/lib/supabase/server";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "처리 기록 | AI 도우미 | HomeFit AI" };

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
    .limit(20);
  if (error) return <LoadError>처리 기록을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  if (data.length === 0) return <Empty>아직 처리한 알림이 없습니다. 알림을 승인하거나 거절하면 여기에 쌓입니다.</Empty>;
  return (
    <ul className={styles.list}>
      {data.map((row) => (
        <li key={row.id}>
          <Link href={`/incidents/${row.id}`}>{(row.facts as { title?: string }).title ?? "알림"}</Link>{" "}
          <span className={styles.muted}>· {STATUS_TEXT[row.status] ?? row.status}{row.closed_at ? ` · ${new Date(row.closed_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}` : ""}</span>
        </li>
      ))}
    </ul>
  );
}

// IA KN_050100_TB 처리 기록 (spec 004). 낱말로 찾기는 기록 찾기 탭(spec 005 FR-006)
export default function KnowledgeHistoryPage() {
  return (
    <section className={styles.card} aria-labelledby="history-title">
      <h2 id="history-title">처리 기록 (최근 20건)</h2>
      <Suspense fallback={<Loading />}>
        <History />
      </Suspense>
    </section>
  );
}
