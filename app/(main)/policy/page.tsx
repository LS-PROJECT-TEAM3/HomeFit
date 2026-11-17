import { SkeletonNotice } from "@/app/_components/page-status";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "청년 주거지원 정책 | 직장과 정책 | HomeFit AI" };

// 기획안 Work & Policy "청년 주거지원 정책" (PRD FR-07, spec 004 뼈대)
export default function PolicyYouthPage() {
  return (
    <section className={styles.card} aria-labelledby="youth-title">
      <h2 id="youth-title">청년 주거지원 정책</h2>
      <SkeletonNotice>온통청년 정책 수집(PRD FR-07)이 들어올 자리입니다. API 응답 칸(Intent Q6)을 확인한 뒤 만듭니다. 자격은 판정하지 않고 &ldquo;공고문 기준 확인 필요&rdquo;로만 안내합니다.</SkeletonNotice>
    </section>
  );
}
