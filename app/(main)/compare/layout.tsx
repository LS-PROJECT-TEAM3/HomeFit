import { Suspense } from "react";
import { SectionTabs, type Tab } from "@/app/_components/section-tabs";
import styles from "@/app/_components/hub.module.css";

// 기획안 9절 Housing Compare (spec 004 v0.2), IA CP_040000_PG
const TABS: Tab[] = [
  { href: "/compare", label: "관심 주택" }, // spec 009
  { href: "/compare/cost", label: "실질 비용 비교" },
  { href: "/compare/recommend", label: "추천 결과" }, // spec 015
];

export default function CompareLayout({ children }: LayoutProps<"/compare">) {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>집 비교</h1>
      <p className={styles.lead}>보고 있는 집들을 월세·관리비·에너지비·교통비를 더한 실질 주거비로 비교합니다(PRD FR-28).</p>
      {/* 관심 주택 상세(/compare/[id])는 주소에 값이 있어 탭을 Suspense로 감싼다(정책 상세와 같은 빌드 오류 방지) */}
      <Suspense fallback={<div className={styles.tabsFallback} aria-hidden="true" />}>
        <SectionTabs tabs={TABS} label="집 비교 메뉴" />
      </Suspense>
      {children}
    </main>
  );
}
