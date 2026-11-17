import { SkeletonNotice } from "@/app/_components/page-status";
import { FIXTURE_NAMES } from "@/watch/sim-fixtures";
import { WEATHER_FIXTURE_NAMES } from "@/watch/weather-fixtures";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "시뮬레이터 | 관리자 | HomeFit AI" };

// IA AD_070500_TB 시뮬레이터 (PRD FR-24, spec 004 뼈대). 가짜 묶음은 개발 환경에서만 돈다
export default function AdminSimPage() {
  return (
    <>
      <SkeletonNotice>화면의 버튼으로 가짜 묶음을 돌리는 것은 다음 단계입니다. 지금은 개발 서버에서 수집 주소 뒤에 ?fixture=이름 을 붙여 돌립니다(운영에서는 막힘).</SkeletonNotice>
      <div className={styles.grid}>
        <section className={styles.card} aria-labelledby="sim-notice">
          <h2 id="sim-notice">마이홈 가짜 공고</h2>
          <p className={styles.muted}>/api/cron/myhome?fixture=…</p>
          <ul className={styles.list}>{FIXTURE_NAMES.map((name) => <li key={name}>{name}</li>)}</ul>
        </section>
        <section className={styles.card} aria-labelledby="sim-weather">
          <h2 id="sim-weather">기상청 가짜 예보</h2>
          <p className={styles.muted}>/api/cron/weather?fixture=…</p>
          <ul className={styles.list}>{WEATHER_FIXTURE_NAMES.map((name) => <li key={name}>{name}</li>)}</ul>
        </section>
      </div>
    </>
  );
}
