import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PosterBand } from "@/app/_components/poster-band";
import { SnapTarget } from "@/app/_components/snap-target";
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
      {/* "알림 N건 · 다가오는 일정 N건" 줄은 뺐다(현경 결정 2026-11-21) */}
      <PosterBand title="안녕하세요" subtitle={homeSummary(data)} numberLabel="오늘 확인할 일" bigNumber={data.newAlerts.length} unit="건" />
      {/* PC: 띠에서 아래로 스크롤하면 "확인할 일"부터 한 화면에 맞게 부드럽게 옮긴다(사용자 요청 2026-11-21). 휴대폰은 띠가 없어 평소처럼 */}
      <SnapTarget minWidth={960} className={styles.snapArea}>
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
      </SnapTarget>
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
