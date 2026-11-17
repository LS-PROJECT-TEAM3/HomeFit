import { StatusLabel } from "@/app/_components/page-status";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "건축물 기본 정보 | 집 점검 | HomeFit AI" };

// IA CP_040303_TB 건축물 정보 (PRD FR-34 보류)
export default function QcBuildingPage() {
  return (
    <section className={styles.card} aria-labelledby="building-title">
      <h2 id="building-title">건축물 기본 정보</h2>
      <StatusLabel status="out" />
      <p className={styles.muted}>건축HUB 연동은 보류입니다(PRD FR-34). 실제 전기설비·건축물 안전 인증은 하지 않습니다.</p>
    </section>
  );
}
