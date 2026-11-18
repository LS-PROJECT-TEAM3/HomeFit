import { SectionTabs, type Tab } from "@/app/_components/section-tabs";
import styles from "@/app/_components/hub.module.css";

// 기획안 9절 Housing Compare (spec 004 v0.2), IA CP_040000_PG
const TABS: Tab[] = [
  { href: "/compare", label: "관심 주택", note: "뼈대" },
  { href: "/compare/cost", label: "실질 비용 비교" },
  { href: "/compare/recommend", label: "추천 결과", note: "범위 밖" },
];

export default function CompareLayout({ children }: LayoutProps<"/compare">) {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>집 비교</h1>
      <p className={styles.lead}>보고 있는 집들을 월세·관리비·에너지비·교통비를 더한 실질 주거비로 비교합니다(PRD FR-28).</p>
      <SectionTabs tabs={TABS} label="집 비교 메뉴" />
      {children}
    </main>
  );
}
