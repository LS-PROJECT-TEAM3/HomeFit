import { SectionBand, type BandTab } from "@/app/_components/section-band";
import styles from "./qc.module.css";

// IA QC_100000_PG 집 점검(v1.17 탭 이름·순서), spec 022 FR-011: 탭 4개 모두 포스터형(현경 결정 2026-11-21). 내용은 캔버스 v2-qc-* 보드
const TABS: BandTab[] = [
  { href: "/qc", label: "결로 위험" },
  { href: "/qc/records", label: "하자/환경 기록" },
  { href: "/qc/checklist", label: "입주 전 점검" }, // spec 019
  { href: "/qc/building", label: "건축물 정보" },
];

export default function QcLayout({ children }: LayoutProps<"/qc">) {
  return (
    <>
      <SectionBand title="집 점검" subtitle="내 집의 결로 위험과 입주 전 점검을 한곳에서 봐요" tabs={TABS} label="집 점검 탭" />
      <main className={styles.main}>{children}</main>
    </>
  );
}
