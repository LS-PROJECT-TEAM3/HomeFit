import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Empty, LoadError, Loading } from "@/app/_components/states";
import type { CompareRow } from "@/incident/real-cost";
import { currentUserId } from "@/lib/supabase/server";
import { CostCell, EstimateNote, TotalText, won } from "../cost-view";
import { loadCompare, type LoadedCompare } from "../load-compare";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "실질 비용 비교 | 집 비교 | HomeFit AI" };

function diffText(row: CompareRow): string {
  if (row.isMine) return "기준";
  if (row.diffFromMine === null) return "—";
  if (row.diffFromMine === 0) return "같음";
  return `${row.diffFromMine > 0 ? "+" : "−"}${won(Math.abs(row.diffFromMine))} ${row.diffFromMine > 0 ? "더 듦" : "덜 듦"}`;
}

async function CostTable() {
  await connection();
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  let loaded: LoadedCompare;
  try {
    loaded = await loadCompare(userId);
  } catch {
    return <LoadError>비교할 자료를 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  if (loaded.empty) return <Empty>내 집 계약 정보나 관심 주택을 넣으면 여기서 비교합니다. <Link href="/compare/new">관심 주택 등록</Link></Empty>;
  return (
    <>
      {loaded.hasMine ? null : <p className={styles.muted}>내 집에 월세를 넣으면 내 집 대비 차이가 보입니다. <Link href="/my/home">내 집 입력</Link></p>}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <caption className={styles.muted}>한 달 기준, 합계가 낮은 순. 괄호는 값의 종류(입력·계산·추정값). 미입력 칸은 합계에서 빠집니다.</caption>
          <thead>
            <tr><th scope="col">집</th><th scope="col">월세</th><th scope="col">관리비</th><th scope="col">에너지비</th><th scope="col">교통비</th><th scope="col">합계</th><th scope="col">내 집 대비</th></tr>
          </thead>
          <tbody>
            {loaded.rows.map((row) => (
              <tr key={row.id}>
                <th scope="row">{row.isMine ? <Link href="/my/home">내 집</Link> : <Link href={`/compare/${row.id}`}>{row.name}</Link>}</th>
                <td><CostCell item={row.cost.rent} /></td><td><CostCell item={row.cost.fee} /></td>
                <td><CostCell item={row.cost.energy} /></td><td><CostCell item={row.cost.transit} /></td>
                <td><TotalText cost={row.cost} /></td><td>{diffText(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <EstimateNote basis={loaded.basis} />
      <p className={styles.muted}>에너지비 &ldquo;계산&rdquo;은 전기 사용량으로 한전 주택용 저압 요금표(기본요금 + 전력량요금)를 쓴 값이고 부가세·기금·기후환경·연료비조정 요금은 빠져 있습니다. 교통비는 편도 요금 × 하루 횟수 × 한 달 출근 일수입니다.</p>
    </>
  );
}

// IA CP_040200_PG 실질 주거비 비교 (spec 009 FR-005, PRD FR-28 v1.10 알파)
export default function CompareCostPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CostTable />
    </Suspense>
  );
}
