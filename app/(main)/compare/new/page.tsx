import { EMPTY_HOME, InterestHomeForm } from "../interest-home-form";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "관심 주택 등록 | 집 비교 | HomeFit AI" };

// IA CP_040100_PG 관심 주택 등록 (spec 009 FR-001, PRD FR-28 v1.10)
export default function CompareNewPage() {
  return (
    <section className={styles.card} aria-labelledby="new-title">
      <h2 id="new-title">관심 주택 등록</h2>
      <InterestHomeForm initial={EMPTY_HOME} />
    </section>
  );
}
