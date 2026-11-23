import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoadError, Loading } from "@/app/_components/states";
import { currentUserId } from "@/lib/supabase/server";
import { CompareBoard } from "./compare-board";
import { loadCompare, type LoadedCompare } from "./load-compare";
import styles from "./compare.module.css";

export const metadata = { title: "집 비교 | HomeFit AI" };

function PageHeader() {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>집 비교</h1>
      <span aria-hidden="true" className={styles.titleLine} />
    </header>
  );
}

async function Board() {
  await connection();
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  let data: LoadedCompare;
  try {
    data = await loadCompare(userId);
  } catch {
    // "관심 주택 없음"과 다른 문구 (P3-12)
    return <><PageHeader /><LoadError>관심 주택을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError></>;
  }
  // 추정값 근거 문단은 화면에 두지 않는다(현경 결정 2026-11-21). 추정 에너지비는 카드에 "(예상)"으로 표시
  return <CompareBoard data={data} header={<PageHeader />} />;
}

// IA CP_040000_PG 집 비교 (IA v1.17 한 화면, spec 022 FR-011, spec 009 FR-001·005, spec 015 FR-001). 기본형(현경 결정 2026-11-21)
export default function ComparePage() {
  return (
    <main className={styles.main}>
      <Suspense fallback={<><PageHeader /><Loading /></>}>
        <Board />
      </Suspense>
    </main>
  );
}
