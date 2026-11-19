import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Empty, LoadError, Loading } from "@/app/_components/states";
import { recommendHomes, type IncompleteHome, type RankedHome } from "@/incident/recommend";
import { currentUserId } from "@/lib/supabase/server";
import { EstimateNote } from "../cost-view";
import { loadCompare, type LoadedCompare } from "../load-compare";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "추천 결과 | 집 비교 | HomeFit AI" };

function RankedCard({ home }: { home: RankedHome }) {
  return (
    <li className={styles.card}>
      <h3>
        {home.rank}위 · <Link href={`/compare/${home.id}`}>{home.name}</Link>
      </h3>
      <ul className={styles.plainList}>
        {home.reasons.map((reason) => <li key={reason} className="tabular-nums">{reason}</li>)}
      </ul>
    </li>
  );
}

function IncompleteList({ homes }: { homes: IncompleteHome[] }) {
  return (
    <section className={styles.section} aria-labelledby="incomplete-title">
      <h2 id="incomplete-title">정보가 덜 찬 집 ({homes.length}곳)</h2>
      <p className={styles.muted}>비어 있는 칸이 있으면 합계가 실제보다 낮게 보여 순위에 넣지 않았습니다.</p>
      <ul className={styles.plainList}>
        {homes.map((home) => (
          <li key={home.id}><Link href={`/compare/${home.id}`}>{home.name}</Link>: {home.reason}</li>
        ))}
      </ul>
    </section>
  );
}

async function RecommendView() {
  await connection();
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  let loaded: LoadedCompare;
  try {
    loaded = await loadCompare(userId);
  } catch {
    // spec 015 E6
    return <LoadError>추천 결과를 만들 자료를 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  const { ranked, incomplete } = recommendHomes(loaded.rows);
  // spec 015 E1
  if (ranked.length === 0 && incomplete.length === 0) return <Empty>관심 주택을 넣으면 실질 주거비가 낮은 순서로 보여 드립니다. <Link href="/compare/new">관심 주택 등록</Link></Empty>;
  return (
    <>
      <section className={styles.section} aria-labelledby="ranked-title">
        <h2 id="ranked-title">실질 주거비가 낮은 순서</h2>
        {/* spec 015 FR-001·SC-003: 점수가 아니라 계산한 합계 순서라는 것을 글로 */}
        <p className={styles.muted}>점수가 아니라 한 달 실질 주거비(월세+관리비+에너지비+교통비) 합계가 낮은 순서입니다. 네 칸이 모두 있는 관심 주택만 넣었습니다.</p>
        {loaded.hasMine ? null : <p className={styles.muted}>내 집에 월세를 넣으면 내 집과의 차이도 보입니다. <Link href="/my/home">내 집 입력</Link></p>}
        {ranked.length ? (
          <ol className={styles.plainList}>{ranked.map((home) => <RankedCard key={home.id} home={home} />)}</ol>
        ) : (
          <p>네 칸이 모두 찬 관심 주택이 없어 순위를 만들지 않았습니다. 아래 집의 빈 칸을 채워 주세요.</p>
        )}
      </section>
      {incomplete.length ? <IncompleteList homes={incomplete} /> : null}
      <EstimateNote basis={loaded.basis} />
    </>
  );
}

// IA CP_040400_TB 추천 결과 (PRD FR-28 v1.13, spec 015)
export default function CompareRecommendPage() {
  return (
    <Suspense fallback={<Loading />}>
      <RecommendView />
    </Suspense>
  );
}
