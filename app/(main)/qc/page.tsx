import Link from "next/link";
import { SkeletonNotice, StatusLabel } from "@/app/_components/page-status";
import { CondensationSimulator } from "./simulator";
import { MoveInChecklist } from "./move-in-checklist";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "집 점검 | HomeFit AI" };

// 기획안 9절 Housing QC (spec 004). IA에는 아직 메뉴가 없다(spec 004 Q1). 입주 전 점검은 IA CP_040301_TB, 하자 기록은 MY_030202_PG
export default function QcPage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>집 점검</h1>
      <p className={styles.lead}>계약 전에 집 상태를 살피고, 사는 동안 결로·습기를 관리합니다.</p>

      <section id="simulator" className={styles.card} aria-labelledby="sim-title">
        <h2 id="sim-title">결로 위험 시뮬레이터</h2>
        <StatusLabel status="ready" />
        <p className={styles.muted}>숫자를 바꿔 보면 바로 계산합니다. 내 집의 실제 알림은 <Link href="/my/home">내 집</Link>에 온습도를 넣으면 예보로 자동 확인합니다.</p>
        <CondensationSimulator />
      </section>

      <section id="checklist" className={`${styles.card} ${styles.section}`} aria-labelledby="check-title">
        <h2 id="check-title">입주 전 품질 점검</h2>
        <StatusLabel status="skeleton" />
        <p className={styles.muted}>집을 보러 갈 때 확인할 것(PRD FR-29). 지금은 저장하지 않고, 관심 주택마다 저장하는 것은 다음 단계입니다.</p>
        <MoveInChecklist />
      </section>

      <section id="defects" className={`${styles.card} ${styles.section}`} aria-labelledby="defect-title">
        <h2 id="defect-title">하자 기록</h2>
        <SkeletonNotice>누수·곰팡이·고장을 날짜·사진과 남깁니다(PRD FR-30, 2차). 누수·건물 하자는 알림으로 예측하지 않습니다.</SkeletonNotice>
      </section>

      <section id="building" className={`${styles.card} ${styles.section}`} aria-labelledby="building-title">
        <h2 id="building-title">건축물 기본 정보</h2>
        <StatusLabel status="out" />
        <p className={styles.muted}>건축HUB 연동은 보류입니다(PRD FR-34). 실제 안전 인증은 하지 않습니다.</p>
      </section>
    </main>
  );
}
