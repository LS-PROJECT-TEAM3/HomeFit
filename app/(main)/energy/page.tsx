import Link from "next/link";
import { StatusLabel } from "@/app/_components/page-status";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "에너지 분석 | HomeFit AI" };

// 기획안 9절 Energy Analysis (spec 004 Q3). PRD 9절 "하지 않을 것": 에너지 시뮬레이션 고도화
export default function EnergyPage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>에너지 분석</h1>
      <section className={styles.card} aria-labelledby="energy-title">
        <h2 id="energy-title">예상 에너지 사용량·월별 비용·냉난방비 시뮬레이션</h2>
        <StatusLabel status="out" />
        <p className={styles.muted}>
          PRD 9절에서 &ldquo;에너지 시뮬레이션 고도화&rdquo;는 하지 않기로 했습니다. 그래서 이 화면은 자리만 있습니다.
          에너지비는 집 비교의 실질 주거비에 추정값 한 칸으로만 들어갈 예정입니다(PRD FR-28).
        </p>
        <ul className={styles.list}>
          <li>창 종류와 결로 위험은 <Link href="/qc#simulator">결로 위험 시뮬레이터</Link>에서 볼 수 있습니다.</li>
          <li>지금 월 예상 주거비(월세 + 관리비)는 <Link href="/">홈</Link>에 있습니다.</li>
        </ul>
      </section>
    </main>
  );
}
