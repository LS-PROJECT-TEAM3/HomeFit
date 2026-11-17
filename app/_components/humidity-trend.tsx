import { sparklinePoints } from "./navigation";
import styles from "./hub.module.css";

type Measurement = { id: string; temperatureC: number; humidityPct: number; measuredAt: string };

const BOX = { width: 280, height: 56 };

function kst(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * spec 004 v0.2 FR-006: 최근 실내 습도 추이(라이브러리 없이 SVG). 그래프는 보조이고, 같은 숫자를 글자로도 보인다
 * (차트는 색만으로 뜻을 전하지 않는다, ui-ux-pro-max Charts & Data). 습도 70% 선은 곰팡이 기준(spec 003 Q2)
 */
export function HumidityTrend({ measurements, compact = false }: { measurements: readonly Measurement[]; compact?: boolean }) {
  const ordered = [...measurements].reverse(); // 오래된 것 → 최근
  const values = ordered.map((m) => m.humidityPct);
  const latest = ordered[ordered.length - 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  return (
    <figure style={{ margin: 0 }}>
      {/* 점이 하나면 선이 아니라 빈 상자로 보여 그리지 않는다 */}
      {values.length < 2 ? null : <svg viewBox={`-4 -4 ${BOX.width + 8} ${BOX.height + 8}`} width="100%" height={BOX.height + 8} role="img"
        aria-label={`최근 ${values.length}번 잰 실내 습도: 가장 낮음 ${min}%, 가장 높음 ${max}%, 마지막 ${latest.humidityPct}%`}>
        <polyline points={sparklinePoints(values, BOX)} fill="none" stroke="var(--color-primary)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      </svg>}
      <figcaption className={styles.muted}>
        최근 {values.length}번 · 가장 낮음 {min}% · 가장 높음 {max}% · 마지막 <strong>{latest.humidityPct}%</strong> ({kst(latest.measuredAt)})
      </figcaption>
      {compact ? null : (
        <ul className={styles.list}>
          {measurements.map((m) => (
            <li key={m.id} className="tabular-nums">{kst(m.measuredAt)} · {m.temperatureC}°C · 습도 {m.humidityPct}%{m.humidityPct >= 70 ? " (70% 이상: 곰팡이 주의)" : ""}</li>
          ))}
        </ul>
      )}
    </figure>
  );
}
