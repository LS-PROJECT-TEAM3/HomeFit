import { SectionTabs, type Tab } from "@/app/_components/section-tabs";
import styles from "@/app/_components/hub.module.css";

// 기획안 9절 Energy Analysis (spec 004 v0.2, Q3) → spec 011 FR-003(근거: 한전 시군구 가구 평균). 냉난방비는 spec 016(도시가스 소매요금표)
const TABS: Tab[] = [
  { href: "/energy", label: "예상 에너지 사용량" },
  { href: "/energy/cost", label: "월별 예상 비용" },
  { href: "/energy/heating", label: "냉난방비 시뮬레이션" }, // spec 016
];

export default function EnergyLayout({ children }: LayoutProps<"/energy">) {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>에너지 분석</h1>
      <p className={styles.lead}>내 집의 한 달 전기 사용량과 달마다 달라지는 예상 전기요금을 봅니다. 사용량을 넣지 않았으면 그 지역 한전 가구 평균으로 추정합니다. 도시가스 요금은 사용량을 넣어 계산합니다.</p>
      <SectionTabs tabs={TABS} label="에너지 분석 메뉴" />
      {children}
    </main>
  );
}
