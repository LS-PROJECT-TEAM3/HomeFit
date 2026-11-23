import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { SectionBand } from "@/app/_components/section-band";
import { LoadError, Loading } from "@/app/_components/states";
import { gasYearFor } from "@/incident/gas-year";
import { currentUserId } from "@/lib/supabase/server";
import { loadMyHome } from "../../my/home/load";
import { ENERGY_TABS } from "../tabs";
import { GasYearCard } from "./gas-year-card";
import { HeatingCalculator } from "./heating-calculator";
import styles from "../energy.module.css";

export const metadata = { title: "난방비 | 에너지 분석 | HomeFit AI" };

// spec 025 FR-002~006: 내 집 고지서로 12개월 예상 난방비. 읽기 실패는 숨기지 않고 알린다(E7). 아래 계산기는 그대로
async function GasYear() {
  await connection();
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  let home: Awaited<ReturnType<typeof loadMyHome>>["home"] | undefined;
  try {
    ({ home } = await loadMyHome(userId));
  } catch (error) {
    console.error("난방비: 내 집을 읽지 못함", error); // 원인을 남긴다(오류를 삼키지 않음)
    home = undefined;
  }
  if (home === undefined) return <LoadError>내 집 도시가스 정보를 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  return <GasYearCard view={gasYearFor(home)} />;
}

// IA EN_110200_TB 난방비 (PRD FR-28 v1.14·v1.24, spec 016, spec 025, spec 022 FR-012 캔버스 v2-energy-merged-heat)
export default function EnergyHeatingPage() {
  return (
    <>
      <SectionBand title="에너지 분석" tabs={ENERGY_TABS} label="에너지 분석 탭" />
      <main className={styles.main}>
        <Suspense fallback={<Loading />}>
          <GasYear />
        </Suspense>
        <HeatingCalculator />
      </main>
    </>
  );
}
