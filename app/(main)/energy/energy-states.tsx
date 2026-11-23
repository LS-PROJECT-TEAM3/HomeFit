import Link from "next/link";
import styles from "./energy.module.css";

// 내 집이 없거나 사용량을 알 수 없을 때 (spec 011 FR-003, E2 → spec 022 캔버스 v2-energy-empty: 큰 글자 + 값은 "-")
const MESSAGE = {
  noHome: ["아직 내 집이 없어요", "내 집을 넣으면 예상 사용량과 요금을 계산해 보여 드려요."],
  failed: ["사용량을 추정하지 못했어요", "한전 통계를 불러오지 못했어요. 잠시 뒤 다시 열거나 내 집에 전기 사용량(kWh)을 넣어 주세요."],
  noStat: ["사용량을 추정하지 못했어요", "이 지역의 한전 통계가 없어요. 내 집에 전기 사용량(kWh)을 넣으면 계산해요."],
} as const;

export function NoUsage({ hasHome, failed }: { hasHome: boolean; failed: number }) {
  const [title, body] = !hasHome ? MESSAGE.noHome : failed ? MESSAGE.failed : MESSAGE.noStat;
  return (
    <section className={styles.card} aria-labelledby="empty-title">
      <div className={styles.emptyGrid}>
        <div className={styles.emptyLeft}>
          <h2 id="empty-title" className={styles.emptyTitle}>{title}</h2>
          <p className={styles.emptyBody}>{body}</p>
          <Link href="/my/home" className={styles.buttonPrimary}>{hasHome ? "내 집에서 입력" : "내 집 넣기"}</Link>
        </div>
        <dl className={styles.kvRows}>
          {["예상 사용량", "전기요금", "부가세 10%"].map((k) => (
            <div key={k}><dt>{k}</dt><dd className={styles.dash} aria-label="내 집을 넣으면 보여 드려요">-</dd></div>
          ))}
        </dl>
      </div>
    </section>
  );
}
