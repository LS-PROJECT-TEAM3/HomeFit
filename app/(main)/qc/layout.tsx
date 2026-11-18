import { SectionTabs, type Tab } from "@/app/_components/section-tabs";
import styles from "@/app/_components/hub.module.css";

// 기획안 9절 Housing QC (spec 004 v0.2): 하위 항목을 탭으로
const TABS: Tab[] = [
  { href: "/qc", label: "결로 위험 시뮬레이터" },
  { href: "/qc/checklist", label: "입주 전 품질 점검", note: "뼈대" },
  { href: "/qc/records", label: "주거환경·하자 기록" },
  { href: "/qc/building", label: "건축물 기본 정보" },
];

export default function QcLayout({ children }: LayoutProps<"/qc">) {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>집 점검</h1>
      <p className={styles.lead}>계약 전에 집 상태를 살피고, 사는 동안 결로·습기를 관리합니다.</p>
      <SectionTabs tabs={TABS} label="집 점검 메뉴" />
      {children}
    </main>
  );
}
