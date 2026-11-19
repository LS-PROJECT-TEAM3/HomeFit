import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Empty, LoadError, Loading } from "@/app/_components/states";
import { HOUSING_LABELS } from "@/incident/home-form";
import { withEstimate } from "@/incident/energy-estimate";
import { loadEstimateBasis, type EstimateBasis } from "@/incident/energy-estimate.server";
import { listMyInterestHomes, type InterestHome } from "@/incident/interest-homes.server";
import { realCost } from "@/incident/real-cost";
import { currentUserId } from "@/lib/supabase/server";
import { EstimateNote, kstMonth, TotalText } from "./cost-view";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "관심 주택 | 집 비교 | HomeFit AI" };

async function HomeList() {
  await connection();
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  let homes: InterestHome[];
  let basis: EstimateBasis;
  try {
    homes = await listMyInterestHomes(userId);
    basis = await loadEstimateBasis(homes, new Date()); // spec 011 FR-002
  } catch {
    return <LoadError>관심 주택을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  if (homes.length === 0) return <Empty>아직 등록한 관심 주택이 없습니다. 보고 있는 집을 넣으면 내 집과 한 달 실질 주거비를 비교합니다.</Empty>;
  const month = kstMonth(new Date());
  return (
    <>
    <ul className={styles.list}>
      {homes.map((home) => (
        <li key={home.id}>
          <Link href={`/compare/${home.id}`}><strong>{home.name}</strong></Link> · {HOUSING_LABELS[home.housingType]} · 한 달 <TotalText cost={realCost(withEstimate(home, basis.averages, basis.aptAverages), month)} />
        </li>
      ))}
    </ul>
    <EstimateNote basis={basis} />
    </>
  );
}

// IA CP_040000_PG 관심 주택 목록 (spec 009 FR-001, PRD FR-28 v1.10)
export default function CompareListPage() {
  return (
    <>
      <p><Link href="/compare/new" className={styles.primaryButton}>+ 관심 주택 등록</Link> <Link href="/compare/cost">실질 비용 비교 보기</Link></p>
      <Suspense fallback={<Loading />}>
        <HomeList />
      </Suspense>
    </>
  );
}
