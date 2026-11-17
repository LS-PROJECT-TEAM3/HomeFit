import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoadError, Loading } from "@/app/_components/states";
import { SkeletonNotice } from "@/app/_components/page-status";
import { monthlyHousingCost } from "@/incident/home-dashboard";
import { currentUserId } from "@/lib/supabase/server";
import { loadMyHome } from "../../my/home/load";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "실질 주거비 비교 | HomeFit AI" };

function won(value: number | null): string {
  return value === null ? "—" : `${value.toLocaleString("ko-KR")}원`;
}

async function CostTable() {
  await connection();
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  let home;
  try {
    home = (await loadMyHome(userId)).home;
  } catch {
    return <LoadError>내 집 정보를 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  const cost = home ? monthlyHousingCost(home) : null;
  const rent = cost && cost.status !== "no_contract" ? cost.rent : null;
  const fee = cost && cost.status !== "no_contract" ? cost.fee : null;
  const total = cost && cost.status !== "no_contract" ? cost.total : null;
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <caption className={styles.muted}>한 달 기준. 에너지비·교통비는 추정값이 들어올 자리입니다.</caption>
        <thead>
          <tr><th scope="col">집</th><th scope="col">월세</th><th scope="col">관리비</th><th scope="col">에너지비(추정)</th><th scope="col">교통비(추정)</th><th scope="col">합계</th></tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">내 집</th>
            <td>{won(rent)}</td><td>{won(fee)}</td><td>다음 단계</td><td>다음 단계</td><td><strong>{won(total)}</strong></td>
          </tr>
          <tr>
            <th scope="row">관심 주택</th>
            <td colSpan={5} className={styles.muted}>관심 주택을 등록하면 여기에 줄이 생깁니다.</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// IA CP_040200_PG 실질 주거비 비교 (PRD FR-28 알파). spec 004 뼈대: 내 집 줄만 실제 값
export default function CompareCostPage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>실질 주거비 비교</h1>
      <SkeletonNotice>내 집 줄은 내 집 화면에 넣은 월세·관리비로 채웁니다. 관심 주택·에너지비·교통비는 다음 단계입니다.</SkeletonNotice>
      <Suspense fallback={<Loading />}>
        <CostTable />
      </Suspense>
    </main>
  );
}
