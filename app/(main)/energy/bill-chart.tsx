import { barHeights, type MonthlyBill } from "@/incident/energy-estimate";
import styles from "@/app/_components/hub.module.css";

const BAR = { width: 20, gap: 8, max: 110 };
const TOP = 18; // "이번 달" 글자 자리
const WIDTH = 12 * (BAR.width + BAR.gap);
const HEIGHT = TOP + BAR.max + 20;

const won = (v: number) => `${v.toLocaleString("ko-KR")}원`;

/**
 * spec 011 FR-003: 12개월 예상 전기요금 막대(라이브러리 없이 SVG, humidity-trend와 같은 방식).
 * 이번 달은 주황 + "이번 달" 글자로 표시해 색만으로 구분하지 않는다(디자인 기본선 5). 숫자는 아래 표에도 있다
 */
export function BillChart({ rows, currentMonth }: { rows: readonly MonthlyBill[]; currentMonth: number }) {
  const heights = barHeights(rows.map((r) => r.bill), BAR.max);
  const bills = rows.map((r) => r.bill);
  const low = Math.min(...bills);
  const high = Math.max(...bills);
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" role="img" style={{ maxWidth: 480, display: "block" }}
        aria-label={`월별 예상 전기요금 막대 그래프: 가장 적은 달 ${won(low)}, 가장 많은 달 ${won(high)}`}>
        {rows.map((row, i) => {
          const x = i * (BAR.width + BAR.gap) + BAR.gap / 2;
          const current = row.month === currentMonth;
          return (
            <g key={row.month}>
              <rect x={x} y={TOP + BAR.max - heights[i]} width={BAR.width} height={heights[i]} rx={3}
                fill={current ? "var(--color-accent)" : "var(--color-primary)"} />
              {current ? <text x={x + BAR.width / 2} y={TOP + BAR.max - heights[i] - 5} textAnchor="middle" fontSize={10} fill="var(--color-text)">이번 달</text> : null}
              <text x={x + BAR.width / 2} y={HEIGHT - 5} textAnchor="middle" fontSize={11} fill="var(--color-muted-text)">{row.month}월</text>
            </g>
          );
        })}
      </svg>
      <figcaption className={styles.muted}>
        가장 적은 달 <strong className="tabular-nums">{won(low)}</strong> · 가장 많은 달 <strong className="tabular-nums">{won(high)}</strong>. 막대 위 &ldquo;이번 달&rdquo;이 {currentMonth}월입니다.
      </figcaption>
    </figure>
  );
}
