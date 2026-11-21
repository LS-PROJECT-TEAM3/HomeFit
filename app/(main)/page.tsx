import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PosterBand } from "@/app/_components/poster-band";
import { LoadError, Loading } from "@/app/_components/states";
import { currentUserId } from "@/lib/supabase/server";
import { toKstDate } from "@/watch/kst";
import { loadHomeDashboard, type HomeDashboard } from "./dashboard-load";
import { CostCard, homeSummary, NoticeCard, PhoneHeader, StatusCard, TodoCard } from "./home-cards";
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
    return <main className={styles.content}><LoadError>홈 정보를 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError></main>;
  }
  const today = toKstDate(now);
  return (
    <>
      <PosterBand title="안녕하세요" subtitle={homeSummary(data)} numberLabel="오늘 확인할 일" bigNumber={data.newAlerts.length} unit="건"
        numberNote={`알림 ${data.newAlerts.length}건 · 다가오는 일정 ${data.schedule.length}건`} />
      <main className={styles.content}>
        <PhoneHeader data={data} />
        <div className={styles.topRow}>
          <div className={styles.mainCol}><TodoCard data={data} today={today} /></div>
          <div className={styles.side}>
            <CostCard data={data} />
            <NoticeCard data={data} />
          </div>
        </div>
        <StatusCard data={data} now={now} today={today} />
      </main>
    </>
  );
}

// IA HM_000000_PG 홈 (spec 022 FR-011, 캔버스 v2-home-pc): 포스터 띠에 "오늘 확인할 일 N건", 아래 흰 카드
export default function HomePage() {
  return (
    <Suspense fallback={<main className={styles.content}><Loading /></main>}>
      <Dashboard />
    </Suspense>
  );
}
