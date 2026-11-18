import type { HumidityFacts } from "@/incident/humidity-detect";
import { describeRiskTime, windowTypeText } from "@/incident/humidity-text";
import styles from "./detail.module.css";

function kst(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" });
}

function c(value: number): string {
  return `${value.toFixed(1)}°C`;
}

/**
 * IA IC_020100_PG 사건 상세의 습도·결로 칸 (FR-006, spec 003). [GLOSSARY 측정값·추정값]
 * 측정값(내가 넣은 값)·예보(기상청 원문 값)·추정값(계산)을 서로 다른 칸과 이름표로 나눈다
 */
export function HumidityFactsView({ facts, now }: { facts: HumidityFacts; now: Date }) {
  const risk = describeRiskTime(facts.riskAt, now);
  return (
    <>
      <section className={styles.card} aria-labelledby="when-title">
        <h2 id="when-title" className={styles.sectionTitle}>언제 조심해야 하나</h2>
        <p className={styles.deadline}>
          가장 위험한 시각: <strong>{risk.at}</strong>
          <span className={styles.deadlineBadge}>{risk.remaining}</span>
        </p>
        <p>
          {facts.condition === "surface"
            ? "이때 창 표면이 이슬점 가까이 차가워져 물방울이 맺힐 수 있습니다."
            : `실내 습도가 높고 앞으로 ${facts.humidHours}시간 동안 습하거나 비·눈이 와서 곰팡이가 생기기 쉽습니다.`}
        </p>
      </section>

      <section className={styles.card} aria-labelledby="measure-title">
        <h2 id="measure-title" className={styles.sectionTitle}>측정값 (내가 넣은 값)</h2>
        <dl className={styles.facts}>
          <dt>실내 온도</dt><dd className="tabular-nums">{c(facts.measurement.temperatureC)}</dd>
          <dt>실내 습도</dt><dd className="tabular-nums">{facts.measurement.humidityPct}%</dd>
          <dt>측정 시각</dt><dd>{kst(facts.measurement.measuredAt)}</dd>
        </dl>
      </section>

      <section className={styles.card} aria-labelledby="forecast-title">
        <h2 id="forecast-title" className={styles.sectionTitle}>예보 (기상청 원문 값)</h2>
        <dl className={styles.facts}>
          <dt>그때 바깥 기온</dt><dd className="tabular-nums">{c(facts.outdoorC)}</dd>
          <dt>그때 바깥 습도</dt><dd className="tabular-nums">{facts.outdoorHumidity === null ? "예보에 없음" : `${facts.outdoorHumidity}%`}</dd>
          <dt>본 예보 범위</dt><dd>앞으로 {facts.forecastHours}시간{facts.forecastHours < 48 ? " (48시간보다 짧음)" : ""}</dd>
          <dt>습하거나 비·눈</dt><dd className="tabular-nums">{facts.humidHours}시간</dd>
        </dl>
        <p className={styles.source}>출처: 기상청 단기예보</p>
      </section>

      <section className={styles.card} aria-labelledby="estimate-title">
        <h2 id="estimate-title" className={styles.sectionTitle}>추정값 (계산한 값)</h2>
        <dl className={styles.facts}>
          <dt>창 표면 온도</dt><dd className="tabular-nums">{c(facts.surfaceC)}</dd>
          <dt>실내 이슬점</dt><dd className="tabular-nums">{c(facts.dewPointC)}</dd>
          <dt>창 종류</dt><dd>{windowTypeText(facts.windowType)}</dd>
        </dl>
        <p className={styles.notice}>창 표면 온도는 창 종류와 기온으로 계산한 값이라 실제와 다를 수 있습니다. 창틀·모서리는 더 차가울 수 있습니다.</p>
        <p className={styles.notice}>누수·건물 하자는 이 알림으로 알 수 없습니다.</p>
      </section>
    </>
  );
}
