import Link from "next/link";
import { InfoTip } from "@/app/_components/info-tip";
import { humidityWeek } from "@/incident/humidity-week";
import type { MyMeasurement } from "../../my/home/load";
import styles from "../qc.module.css";

// spec 004 v0.2 FR-006 → spec 022 FR-011(캔버스 v2-qc-log-pc): 실내 습도 최근 7일. 입력한 날만 점

const md = (date: string) => `${date.slice(5, 7)}.${date.slice(8, 10)}`;

function WeekChart({ measurements, today }: { measurements: MyMeasurement[]; today: string }) {
  const { days, points } = humidityWeek(measurements, today);
  const label = `실내 습도 최근 7일, 입력한 날 ${points.map((p) => `${md(p.date)} ${p.value}`).join(", ")}`;
  return (
    <svg role="img" aria-label={label} width="100%" viewBox="0 0 440 190" style={{ display: "block" }}>
      <line x1="0" x2="440" y1="162" y2="162" strokeWidth="1" stroke="var(--line-normal-normal)" />
      {points.map((p) => (
        <g key={p.date}>
          <circle cx={p.x} cy={p.y} r="5" fill="var(--primary-normal)" />
          <text x={p.x} y={p.y - 12} fontSize="13" fontWeight="700" textAnchor="middle" fill="var(--label-normal)">{p.value}</text>
        </g>
      ))}
      {/* 입력하지 않은 날은 흐린 글자로(색과 함께 점이 없음으로도 구분) */}
      {days.map((d) => (
        <text key={d.date} x={d.x} y="182" fontSize="12" textAnchor="middle" fill={d.hasValue ? "var(--label-neutral)" : "var(--chart-wiki-6)"}>{d.label}</text>
      ))}
    </svg>
  );
}

export function HumidityCard({ hasHome, measurements, today }: { hasHome: boolean; measurements: MyMeasurement[]; today: string }) {
  const latest = measurements[0];
  const latestDate = latest ? new Date(Date.parse(latest.measuredAt) + 9 * 3_600_000).toISOString().slice(0, 10) : null;
  return (
    <section className={styles.card} aria-labelledby="humidity-title">
      <div className={styles.logHead}>
        <span className={styles.logTitleRow}>
          <h2 id="humidity-title" className={styles.cardTitle}>실내 습도</h2>
          <span className={styles.subLabel}>최근 7일</span>
          <InfoTip icon text="내가 입력한 날만 점으로 찍어요. 입력하지 않은 날은 비워 둬요." label="실내 습도 설명 보기" />
        </span>
        <Link href="/my/home" className={styles.arrowLink}><span>내 집에서 입력</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9" /></svg></Link>
      </div>
      {!hasHome ? <p className={styles.emptyText}>내 집을 등록하면 실내 습도 기록이 여기에 쌓여요</p> : !latest ? <p className={styles.emptyText}>아직 입력한 기록이 없어요</p> : (
        <>
          <div className={styles.bigRow}>
            <span className={styles.bigValue}>{latest.humidityPct}<span className={styles.bigUnit}>%</span></span>
            <span className={styles.bigNote}>{latestDate === today ? "오늘 " : ""}{latestDate ? md(latestDate) : ""}</span>
          </div>
          <WeekChart measurements={measurements} today={today} />
        </>
      )}
    </section>
  );
}
