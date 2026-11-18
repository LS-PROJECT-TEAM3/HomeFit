import { StatusLabel } from "@/app/_components/page-status";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "추천 결과 | 집 비교 | HomeFit AI" };

// 기획안 "개인화 추천 결과·추천 근거": PRD 9절 하지 않을 것(개인화 추천 점수), spec 004 Q2
export default function CompareRecommendPage() {
  return (
    <section className={styles.card} aria-labelledby="rec-title">
      <h2 id="rec-title">개인화 추천 결과·추천 근거</h2>
      <StatusLabel status="out" />
      <p className={styles.muted}>PRD에서 개인화 추천 점수는 하지 않기로 했습니다. 실질 비용 비교 탭의 숫자로 직접 판단합니다.</p>
    </section>
  );
}
