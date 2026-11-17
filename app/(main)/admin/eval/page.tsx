import { SkeletonNotice } from "@/app/_components/page-status";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "채점 결과 | 관리자 | HomeFit AI" };

// IA AD_070600_TB 채점 결과 (PRD FR-25, spec 004 뼈대)
export default function AdminEvalPage() {
  return (
    <>
      <SkeletonNotice>정답 묶음과 비교해 맞힌·놓친·잘못 울린 수를 파일과 화면으로 보여 줄 자리입니다(PRD FR-25, 평가항목 P3-06).</SkeletonNotice>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th scope="col">묶음</th><th scope="col">맞힘</th><th scope="col">놓침</th><th scope="col">잘못 울림</th></tr></thead>
          <tbody><tr><td colSpan={4} className={styles.muted}>아직 채점을 돌리지 않았습니다.</td></tr></tbody>
        </table>
      </div>
    </>
  );
}
