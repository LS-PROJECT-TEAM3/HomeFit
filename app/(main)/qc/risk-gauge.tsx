import type { CondensationLevel } from "@/incident/condensation";

// spec 022 FR-011: 결로 위험 계기판(캔버스 v2-qc-sim-tab-pc의 SVG 값 그대로). 바늘은 단계 칸의 가운데를 가리킨다.
// 단계는 아래 큰 글자로도 보이므로 그림은 role="img"와 이름표로 알린다
const NEEDLE: Record<CondensationLevel, [number, number]> = {
  low: [76.1, 110], // 150°
  caution: [180, 50], // 90°
  high: [283.9, 110], // 30°
};
const NAME: Record<CondensationLevel, string> = { low: "낮음", caution: "주의", high: "높음" };

export function RiskGauge({ level }: { level: CondensationLevel }) {
  const [x2, y2] = NEEDLE[level];
  return (
    <svg role="img" aria-label={`결로 위험 단계 ${NAME[level]}`} width="100%" viewBox="0 0 360 214" style={{ display: "block", maxWidth: 360, margin: "0 auto" }}>
      <path d="M24.0 170.0 A156.0 156.0 0 0 1 97.3 37.7" fill="none" strokeWidth="22" stroke="var(--primary-normal)" />
      <path d="M106.8 32.3 A156.0 156.0 0 0 1 253.2 32.3" fill="none" strokeWidth="22" stroke="var(--status-cautionary)" />
      <path d="M262.7 37.7 A156.0 156.0 0 0 1 336.0 170.0" fill="none" strokeWidth="22" stroke="var(--status-negative)" />
      <line x1="180" y1="170" x2={x2} y2={y2} strokeWidth="4" strokeLinecap="round" stroke="var(--label-normal)" />
      <circle cx="180" cy="170" r="9" fill="var(--label-normal)" />
      <text x="24" y="200" fontSize="14" textAnchor="middle" fill="var(--label-neutral)">낮음</text>
      <text x="336" y="200" fontSize="14" textAnchor="middle" fill="var(--status-negative)">높음</text>
    </svg>
  );
}
