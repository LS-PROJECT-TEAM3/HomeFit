import { usageTier } from "@/incident/energy-estimate";
import styles from "@/app/_components/hub.module.css";

const WIDTH = 300;
const BAR_Y = 26;
const BAR_H = 22;
const SHADES = ["var(--color-muted-bg)", "var(--color-tier-2)", "var(--color-tier-3)"] as const;

/**
 * spec 011 FR-003: 한 달 사용량이 누진 몇 구간에 있는지 가로 막대(SVG). 구간 이름과 경계를 글자로 함께 적는다(디자인 기본선 5).
 * 구간 경계는 spec 009 요금표(평소 200·400, 7·8월 300·450 kWh)
 */
export function UsageTierChart({ kwh, month }: { kwh: number; month: number }) {
  const { tier, limits: [first, second] } = usageTier(kwh, month);
  const scaleMax = Math.max(second * 1.25, kwh * 1.1);
  const x = (v: number) => (v / scaleMax) * WIDTH;
  const segments = [[0, first], [first, second], [second, scaleMax]] as const;
  const ranges = [`~${first}`, `${first + 1}~${second}`, `${second + 1}~`];
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${WIDTH} 84`} width="100%" role="img" style={{ maxWidth: 480, display: "block" }}
        aria-label={`한 달 ${kwh}kWh는 ${month}월 기준 누진 ${tier}구간(${ranges[tier - 1]}kWh)입니다`}>
        {segments.map(([from, to], i) => (
          <g key={i}>
            <rect x={x(from)} y={BAR_Y} width={x(to) - x(from)} height={BAR_H} fill={SHADES[i]} />
            <text x={(x(from) + x(to)) / 2} y={BAR_Y + 15} textAnchor="middle" fontSize={10} fill="var(--color-text)">{i + 1}구간</text>
            {i < 2 ? <text x={x(to)} y={BAR_Y + BAR_H + 14} textAnchor="middle" fontSize={10} fill="var(--color-muted-text)">{to}</text> : null}
          </g>
        ))}
        {/* 표시는 막대 위 삼각형으로만: 막대 안 구간 글자를 가리지 않게 */}
        <path d={`M ${x(kwh) - 6} ${BAR_Y - 8} L ${x(kwh) + 6} ${BAR_Y - 8} L ${x(kwh)} ${BAR_Y} Z`} fill="var(--color-accent)" />
        <text x={Math.min(Math.max(x(kwh), 40), WIDTH - 40)} y={BAR_Y - 12} textAnchor="middle" fontSize={11} fill="var(--color-text)">내 사용량 {kwh}</text>
        <text x={WIDTH} y={82} textAnchor="end" fontSize={10} fill="var(--color-muted-text)">kWh</text>
      </svg>
      <figcaption className={styles.muted}>
        {month}월 요금표 기준 <strong>누진 {tier}구간</strong>({ranges[tier - 1]}kWh)입니다. 구간이 오를수록 1kWh당 요금이 비싸집니다.
      </figcaption>
    </figure>
  );
}
