import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoadError, Loading } from "@/app/_components/states";
import { electricityBill } from "@/incident/real-cost";
import { currentUserId } from "@/lib/supabase/server";
import { EstimateNote, kstMonth, won } from "../compare/cost-view";
import { NoUsage, USAGE_KIND } from "./energy-states";
import { loadEnergyUsage, type EnergyLoaded } from "./load";
import { UsageTierChart } from "./usage-tier-chart";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "예상 에너지 사용량 | 에너지 분석 | HomeFit AI" };

async function Usage() {
  await connection();
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const now = new Date();
  let loaded: EnergyLoaded;
  try {
    loaded = await loadEnergyUsage(userId, now);
  } catch {
    return <LoadError>내 집 정보를 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  if (!loaded.hasHome || !loaded.usage) return <NoUsage hasHome={loaded.hasHome} failed={loaded.hasHome ? loaded.basis.failed : 0} />;
  const { usage, basis } = loaded;
  const month = kstMonth(now);
  return (
    <section className={styles.card} aria-labelledby="usage-title">
      <h2 id="usage-title">한 달 예상 전기 사용량</h2>
      <p className="tabular-nums"><strong>{usage.kwh.toLocaleString("ko-KR")} kWh</strong> <small>({USAGE_KIND[usage.kind]})</small></p>
      <UsageTierChart kwh={usage.kwh} month={month} />
      <p className="tabular-nums">이번 달({month}월) 요금표로 <strong>{won(electricityBill(usage.kwh, month))}</strong> <small>(부가 요금 제외)</small></p>
      <EstimateNote basis={basis} />
    </section>
  );
}

// 기획안 Energy Analysis "예상 에너지 사용량" (spec 011 FR-003)
export default function EnergyUsagePage() {
  return (
    <Suspense fallback={<Loading />}>
      <Usage />
    </Suspense>
  );
}
