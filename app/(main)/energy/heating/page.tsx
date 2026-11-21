import { SectionBand } from "@/app/_components/section-band";
import { ENERGY_TABS } from "../tabs";
import { HeatingCalculator } from "./heating-calculator";
import styles from "../energy.module.css";

export const metadata = { title: "난방비 | 에너지 분석 | HomeFit AI" };

// IA EN_110200_TB 난방비 (PRD FR-28 v1.14, spec 016, spec 022 FR-012 캔버스 v2-energy-merged-heat)
export default function EnergyHeatingPage() {
  return (
    <>
      <SectionBand title="에너지 분석" tabs={ENERGY_TABS} label="에너지 분석 탭" />
      <main className={styles.main}>
        <HeatingCalculator />
      </main>
    </>
  );
}
