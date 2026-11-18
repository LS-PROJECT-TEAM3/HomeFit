import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoadError, Loading } from "@/app/_components/states";
import { currentUserId } from "@/lib/supabase/server";
import { toKstDate } from "@/watch/kst";
import { loadHomeDashboard, type HomeDashboard } from "./dashboard-load";
import { AlertsCard, DecisionCard, EnvironmentCard, HomeInfoCard, HousingCostCard, ScheduleCard, TimelineCard } from "./home-cards";
import styles from "./page.module.css";

async function Dashboard() {
  await connection();
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const now = new Date();
  let data: HomeDashboard;
  try {
    data = await loadHomeDashboard(userId, now);
  } catch {
    // "데이터 없음"과 다른 문구 (P3-12)
    return <LoadError>홈 정보를 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  const today = toKstDate(now);
  return (
    <div className={styles.bento}>
      <HomeInfoCard data={data} today={today} />
      <HousingCostCard data={data} />
      <EnvironmentCard data={data} now={now} />
      <AlertsCard data={data} />
      <DecisionCard data={data} />
      <TimelineCard data={data} />
      <ScheduleCard data={data} today={today} />
    </div>
  );
}

// IA HM_000000_PG 홈 v1.4 (spec 003 v0.2 FR-010, PRD v1.6 FR-13, spec 004 v0.2 FR-006): "내 집" 중심 벤토 대시보드, 숫자를 누르면 그 목록으로
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
