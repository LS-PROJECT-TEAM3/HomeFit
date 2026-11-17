import Link from "next/link";
import { CondensationSimulator } from "./simulator";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "결로 위험 시뮬레이터 | 집 점검 | HomeFit AI" };

// spec 004 FR-003: 결로 위험 시뮬레이터(기능 003 계산을 그대로 씀, 저장 안 함)
export default function QcSimulatorPage() {
  return (
    <section className={styles.card} aria-labelledby="sim-title">
      <h2 id="sim-title">결로 위험 시뮬레이터</h2>
      <p className={styles.muted}>숫자를 바꿔 보면 바로 계산합니다. 내 집의 실제 알림은 <Link href="/my/home">내 정보 → 내 집</Link>에 온습도를 넣으면 예보로 자동 확인합니다.</p>
      <CondensationSimulator />
    </section>
  );
}
