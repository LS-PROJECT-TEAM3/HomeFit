import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Empty, LoadError, Loading } from "@/app/_components/states";
import { SkeletonNotice } from "@/app/_components/page-status";
import { HumidityTrend } from "@/app/_components/humidity-trend";
import { currentUserId } from "@/lib/supabase/server";
import { loadMyHome } from "../../my/home/load";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "주거환경·하자 기록 | 집 점검 | HomeFit AI" };

async function Records() {
  await connection();
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  let mine;
  try {
    mine = await loadMyHome(userId);
  } catch {
    return <LoadError>기록을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  if (!mine.home) return <Empty>내 집을 등록하면 실내 온습도 기록이 여기에 쌓입니다. <Link href="/my/home">내 집 등록</Link></Empty>;
  if (mine.measurements.length === 0) return <Empty>아직 측정값이 없습니다. <Link href="/my/home">온습도 넣기</Link></Empty>;
  return <HumidityTrend measurements={mine.measurements} />;
}

// 기획안 Housing QC "주거환경 및 하자 기록" (spec 004 v0.2). 하자 기록은 IA MY_030202_PG(2차)
export default function QcRecordsPage() {
  return (
    <>
      <section className={styles.card} aria-labelledby="env-title">
        <h2 id="env-title">실내 온습도 기록</h2>
        <Suspense fallback={<Loading />}>
          <Records />
        </Suspense>
      </section>
      <section className={`${styles.card} ${styles.section}`} aria-labelledby="defect-title">
        <h2 id="defect-title">하자 기록</h2>
        <SkeletonNotice>누수·곰팡이·고장을 날짜·사진과 남길 자리입니다(PRD FR-30, 2차). 누수·건물 하자는 알림으로 예측하지 않습니다.</SkeletonNotice>
      </section>
    </>
  );
}
