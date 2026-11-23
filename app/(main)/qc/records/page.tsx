import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoadError, Loading } from "@/app/_components/states";
import { currentUserId } from "@/lib/supabase/server";
import { toKstDate } from "@/watch/kst";
import { loadMyHome } from "../../my/home/load";
import { DefectPanel } from "./defect-panel";
import { HumidityCard } from "./humidity-card";
import { loadDefects } from "./load-defects";
import styles from "../qc.module.css";

export const metadata = { title: "하자/환경 기록 | 집 점검 | HomeFit AI" };

async function Records() {
  await connection();
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  let loaded;
  try {
    const [mine, defects] = await Promise.all([loadMyHome(userId), loadDefects(userId)]);
    loaded = { mine, defects };
  } catch {
    // "기록 없음"과 다른 문구 (P3-12)
    return <LoadError>기록을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  const today = toKstDate(new Date());
  return (
    <div className={styles.logGrid}>
      <HumidityCard hasHome={loaded.mine.home !== null} measurements={loaded.mine.measurements} today={today} />
      <DefectPanel hasHome={loaded.defects.hasHome} defects={loaded.defects.defects} today={today} />
    </div>
  );
}

// IA QC_100200_TB 하자/환경 기록 (spec 004 v0.2, 하자 기록 spec 019, spec 022 FR-011 캔버스 v2-qc-log-pc)
export default function QcRecordsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Records />
    </Suspense>
  );
}
