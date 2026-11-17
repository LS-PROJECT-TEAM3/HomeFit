import { SectionTabs, type Tab } from "@/app/_components/section-tabs";
import styles from "@/app/_components/hub.module.css";

// 기획안 9절 Energy Analysis (spec 004 v0.2, Q3). PRD 9절 하지 않을 것: 에너지 시뮬레이션 고도화
const TABS: Tab[] = [
  { href: "/energy", label: "예상 에너지 사용량", note: "범위 밖" },
  { href: "/energy/cost", label: "월별 예상 비용", note: "범위 밖" },
  { href: "/energy/heating", label: "냉난방비 시뮬레이션", note: "범위 밖" },
];

export default function EnergyLayout({ children }: LayoutProps<"/energy">) {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>에너지 분석</h1>
      <p className={styles.lead}>PRD에서 에너지 시뮬레이션 고도화는 하지 않기로 해서, 이 화면은 자리만 있습니다. 에너지비는 집 비교에 추정값 한 칸으로 들어갈 예정입니다.</p>
      <SectionTabs tabs={TABS} label="에너지 분석 메뉴" />
      {children}
    </main>
  );
}
