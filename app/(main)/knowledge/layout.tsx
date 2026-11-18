import { SectionTabs, type Tab } from "@/app/_components/section-tabs";
import styles from "@/app/_components/hub.module.css";

// 기획안 9절 AI Assistant = IA KN_050000_PG 기록 찾기 (PRD FR-18, spec 004 v0.2)
const TABS: Tab[] = [
  { href: "/knowledge", label: "기록 찾기" },
  { href: "/knowledge/history", label: "처리 기록" },
  { href: "/knowledge/sources", label: "공공데이터 출처" },
];

export default function KnowledgeLayout({ children }: LayoutProps<"/knowledge">) {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>AI 도우미</h1>
      <SectionTabs tabs={TABS} label="AI 도우미 메뉴" />
      {children}
    </main>
  );
}
