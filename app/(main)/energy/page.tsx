import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { InfoTip } from "@/app/_components/info-tip";
import { SectionBand } from "@/app/_components/section-band";
import { LoadError, Loading } from "@/app/_components/states";
import { electricityBreakdown, yearlyBills } from "@/incident/energy-estimate";
import { currentUserId } from "@/lib/supabase/server";
import { kstMonth } from "../compare/cost-view";
import { BillChart } from "./bill-chart";
import { about, BandFigure, PhoneSummary } from "./energy-figure";
import { NoUsage } from "./energy-states";
import { ENERGY_TABS } from "./tabs";
import { UsageTierChart } from "./usage-tier-chart";
import { loadEnergyUsage, type EnergyLoaded } from "./load";
import styles from "./energy.module.css";

export const metadata = { title: "전기 | 에너지 분석 | HomeFit AI" };

const band = (figure?: React.ReactNode) => <SectionBand title="에너지 분석" tabs={ENERGY_TABS} label="에너지 분석 탭" figure={figure} />;

async function Electricity() {
  await connection();
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const now = new Date();
  let loaded: EnergyLoaded;
  try {
    loaded = await loadEnergyUsage(userId, now);
  } catch {
    return <>{band()}<main className={styles.main}><LoadError>내 집 정보를 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError></main></>;
  }
  if (!loaded.hasHome || !loaded.usage) {
    return <>{band()}<main className={styles.main}><NoUsage hasHome={loaded.hasHome} failed={loaded.hasHome ? loaded.basis.failed : 0} /></main></>;
  }
  const { kwh, kind } = loaded.usage;
  const month = kstMonth(now);
  const b = electricityBreakdown(kwh, month);
  const totals = yearlyBills(kwh).map((m) => m.bill + Math.round(m.bill * 0.1)); // 부가세 포함
  const maxIdx = totals.indexOf(Math.max(...totals));
  const props = { b, kwh, estimated: kind === "estimated" };
  return (
    <>
      {band(<BandFigure {...props} />)}
      <main className={styles.main}>
        <PhoneSummary {...props} />
        <section className={styles.card} aria-labelledby="tier-title">
          <span className={styles.cardTitleRow}>
            <h2 id="tier-title" className={styles.cardTitle}>누진 구간에서 내 위치</h2>
            <InfoTip icon text="많이 쓸수록 kWh당 요금이 올라가는 방식이에요. 7·8월은 구간 경계가 300·450kWh로 넓어져요." label="누진 구간 설명 보기" />
          </span>
          <UsageTierChart kwh={kwh} b={b} />
        </section>
        <section className={styles.card} aria-labelledby="bars-title">
          <span className={styles.cardTitleRow}>
            <h2 id="bars-title" className={styles.cardTitle}>12개월 예상 전기요금</h2>
            <InfoTip icon text="같은 사용량에 달마다 요금표를 적용한 예상 요금이에요. 부가세를 포함했고 단위는 만 원이에요. 초록은 이번 달, 갈색은 가장 많은 달이에요." label="12개월 예상 전기요금 설명 보기" />
          </span>
          <BillChart values={totals} month={month} currentText={`${month}월 약 ${about(totals[month - 1])}원`} maxText={`${maxIdx + 1}월 약 ${about(totals[maxIdx])}원`} />
        </section>
      </main>
    </>
  );
}

// IA EN_110000_PG 전기 (spec 011 FR-003, spec 022 FR-012, 캔버스 v2-energy-pc). 월별 예상 비용 탭은 여기로 합침(IA v1.17)
export default function EnergyPage() {
  return (
    <Suspense fallback={<main className={styles.main}><Loading /></main>}>
      <Electricity />
    </Suspense>
  );
}
