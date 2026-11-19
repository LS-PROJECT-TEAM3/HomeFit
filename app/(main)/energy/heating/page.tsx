import { GAS_TARIFF } from "@/incident/gas-bill";
import { HeatingCalculator } from "./heating-calculator";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "냉난방비 시뮬레이션 | 에너지 분석 | HomeFit AI" };

// IA EN_110200_TB 냉난방비 시뮬레이션 (PRD FR-28 v1.14, spec 016)
export default function EnergyHeatingPage() {
  const { source } = GAS_TARIFF;
  return (
    <>
      <HeatingCalculator />
      {/* spec 016 FR-003: 근거와 실제 고지서와 다를 수 있는 이유 */}
      <p className={styles.muted}>
        근거: <a href={source.url} target="_blank" rel="noreferrer">{source.name}</a>({source.basedOn} 기준, {source.unit}). 기본요금이 여러 개인 지역은 개별난방 값을 썼습니다.
        회사마다 요금 조정 시기와 세부 구분이 다르고 계량기 온도·압력 보정이 있어 실제 고지서와 다를 수 있습니다. 지역난방·중앙난방·LPG는 계산하지 않습니다.
      </p>
    </>
  );
}
