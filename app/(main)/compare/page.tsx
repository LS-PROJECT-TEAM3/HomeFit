import Link from "next/link";
import { SkeletonNotice, StatusLabel } from "@/app/_components/page-status";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "집 비교 | HomeFit AI" };

// IA CP_040000_PG 집 비교 (PRD FR-28 Should, 2차). spec 004 뼈대
export default function ComparePage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>집 비교</h1>
      <SkeletonNotice>관심 주택을 등록하고 월세·관리비·에너지비·교통비를 더한 실질 주거비로 비교합니다(PRD FR-28). 지금은 화면만 있습니다.</SkeletonNotice>
      <div className={styles.grid}>
        <Link href="/compare/new" className={styles.card}>
          <h2>관심 주택 등록</h2>
          <p className={styles.muted}>보고 있는 집의 지역·면적·보증금·월세·관리비를 넣습니다.</p>
          <StatusLabel status="skeleton" />
        </Link>
        <Link href="/compare/cost" className={styles.card}>
          <h2>실질 주거비 비교</h2>
          <p className={styles.muted}>내 집과 관심 주택을 한 표에서 비교합니다. 추정값은 &ldquo;추정&rdquo;으로 표시합니다.</p>
          <StatusLabel status="skeleton" />
        </Link>
        <section className={styles.card} aria-labelledby="recommend-title">
          <h2 id="recommend-title">개인화 추천 결과·추천 근거</h2>
          <p className={styles.muted}>PRD 9절 &ldquo;하지 않을 것&rdquo;(개인화 추천 점수)이라 만들지 않습니다. 비교 표의 숫자로 직접 판단합니다.</p>
          <StatusLabel status="out" />
        </section>
      </div>
      <section className={styles.section} aria-labelledby="list-title">
        <h2 id="list-title">내 관심 주택</h2>
        <p className={styles.muted}>아직 등록한 관심 주택이 없습니다. 저장 기능은 다음 단계에서 만듭니다.</p>
      </section>
    </main>
  );
}
