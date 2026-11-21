import type { ElectricityBreakdown } from "@/incident/energy-estimate";
import { RATE_TABLE } from "@/incident/real-cost";
import styles from "./energy.module.css";

// spec 011 FR-003 → spec 022 FR-012(캔버스 v2-energy-pc, DS TierChart): 누진 구간 계단 그림. 지금 구간·다음 구간까지·구간 요금을 글자로도
const STEP_HEIGHTS = [104, 152, 200];

export function UsageTierChart({ kwh, b }: { kwh: number; b: ElectricityBreakdown }) {
  const [first, second] = b.limits;
  const prices = RATE_TABLE.perKwh.map((p) => Math.round(p));
  const tiers = [
    { name: "1구간", range: `0~${first}kWh`, from: 0, to: first },
    { name: "2구간", range: `${first + 1}~${second}kWh`, from: first, to: second },
    { name: "3구간", range: `${second + 1}~kWh`, from: second, to: second + 200 },
  ];
  const label = `누진 구간 1구간 kWh당 ${prices[0]}원, 2구간 ${prices[1]}원, 3구간 ${prices[2]}원. 지금 ${b.tier}구간, ${kwh}kWh`;
  return (
    <div className={styles.tier}>
      <div className={styles.tierLeft}>
        <div className={styles.tierNow}><span className={styles.tierNowLabel}>지금</span><span className={styles.tierNowValue}>{b.tier}구간</span></div>
        <dl className={styles.kvRows}>
          <div><dt>다음 구간까지</dt><dd>{b.toNext === null ? "마지막 구간" : `${b.toNext.toLocaleString("ko-KR")}kWh`}</dd></div>
          <div><dt>이번 구간 요금</dt><dd>kWh당 {b.pricePerKwh}원</dd></div>
        </dl>
      </div>
      <div className={styles.tierSteps} role="img" aria-label={label}>
        {tiers.map((t, i) => {
          const current = i + 1 === b.tier;
          // 표시(약 130px)가 옆 구간 이름 위로 넘어가지 않게 칸 안쪽 35~65%에만
          const pos = Math.max(35, Math.min(65, ((kwh - t.from) / (t.to - t.from)) * 100));
          return (
            <div key={t.name} className={styles.tierCol}>
              <div className={styles.tierArea}>
                <div className={`${styles.tierStep} ${current ? styles.tierCurrent : ""}`} style={{ height: STEP_HEIGHTS[i] }}>
                  <div className={styles.tierName}>{t.name}</div>
                  <div className={styles.tierPrice}>kWh당 {prices[i]}원</div>
                </div>
                {current ? (
                  <div className={styles.tierMark} style={{ left: `${pos}%`, bottom: STEP_HEIGHTS[i] }}>
                    <span className={styles.tierPill}>내 위치 {kwh.toLocaleString("ko-KR")}kWh</span>
                    <span className={styles.tierLine} aria-hidden="true" />
                  </div>
                ) : null}
              </div>
              <span className={styles.tierRange}>{t.range}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
