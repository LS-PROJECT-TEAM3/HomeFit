import { SkeletonNotice } from "@/app/_components/page-status";
import { MoveInChecklist } from "../move-in-checklist";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "입주 전 품질 점검 | 집 점검 | HomeFit AI" };

// IA CP_040301_TB 입주 전 점검 (PRD FR-29, spec 004 FR-004 뼈대: 저장하지 않음)
export default function QcChecklistPage() {
  return (
    <section className={styles.card} aria-labelledby="check-title">
      <h2 id="check-title">입주 전 품질 점검</h2>
      <SkeletonNotice>집을 보러 갈 때 확인할 것입니다. 관심 주택마다 저장하는 것은 다음 단계입니다.</SkeletonNotice>
      <MoveInChecklist />
    </section>
  );
}
