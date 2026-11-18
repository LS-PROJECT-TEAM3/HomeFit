import { StatusLabel } from "@/app/_components/page-status";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "직장·생활권 | 직장과 정책 | HomeFit AI" };

// 기획안 Work & Policy "직장 및 생활권 분석": PRD FR-33 보류
export default function PolicyCommutePage() {
  return (
    <section className={styles.card} aria-labelledby="commute-title">
      <h2 id="commute-title">직장 및 생활권 분석</h2>
      <StatusLabel status="out" />
      <p className={styles.muted}>출퇴근 정보는 보류입니다(PRD FR-33, 이후 범위).</p>
    </section>
  );
}
