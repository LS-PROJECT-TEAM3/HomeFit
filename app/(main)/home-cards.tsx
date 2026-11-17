import Link from "next/link";
import { HumidityTrend } from "@/app/_components/humidity-trend";
import { isIncidentStatus, StatusBadge } from "@/app/_components/status";
import { describeDeadline } from "@/incident/checklist";
import { contractEndText, environmentLine, measurementState, monthlyHousingCost, toPyeong } from "@/incident/home-dashboard";
import { HOUSING_LABELS } from "@/incident/home-form";
import { describeRiskTime, windowTypeText } from "@/incident/humidity-text";
import type { HomeDashboard } from "./dashboard-load";
import styles from "./page.module.css";

// spec 003 v0.2 FR-010 + spec 004 v0.2 FR-006: "내 집" 중심 벤토 대시보드. 숫자·작은 그래프는 글자와 함께
// 비어 있는 카드는 지우지 않고 입력을 권하는 카드로 (IA v1.4 홈)

function won(value: number): string {
  return `${value.toLocaleString("ko-KR")}원`;
}

function kst(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** ① 나의 주거 정보 */
export function HomeInfoCard({ data, today }: { data: HomeDashboard; today: string }) {
  const home = data.home;
  if (!home) {
    return (
      <Link href="/my/home" className={`${styles.card} ${styles.span2} ${styles.callout}`}>
        <span className={styles.cardLabel}>나의 주거 정보</span>
        <strong className={styles.headline}>내 집을 등록해 주세요</strong>
        <span className={styles.muted}>등록하면 결로 위험과 월 예상 주거비를 알려 드립니다.</span>
      </Link>
    );
  }
  const end = contractEndText(home.contractEndDate, today);
  return (
    <Link href="/my/home" className={`${styles.card} ${styles.span2}`} aria-label="나의 주거 정보, 내 집 화면으로">
      <span className={styles.cardLabel}>나의 주거 정보</span>
      <strong className={styles.headline}>{data.sigunguName ?? "시군구"} · {HOUSING_LABELS[home.housingType]}</strong>
      <dl className={styles.facts}>
        <div><dt>전용면적</dt><dd className="tabular-nums">{home.exclusiveAreaM2}㎡ (약 {toPyeong(home.exclusiveAreaM2)}평)</dd></div>
        <div><dt>창 종류</dt><dd>{windowTypeText(home.windowType)}</dd></div>
        <div><dt>계약</dt><dd>{home.contractType ? (home.contractType === "monthly" ? "월세" : "전세") : "미입력"}</dd></div>
        <div><dt>만료</dt><dd>{end ?? "미입력"}</dd></div>
      </dl>
    </Link>
  );
}

/** ② 월 예상 주거비 = 월세 + 관리비. 막대는 둘의 비율(숫자도 함께) */
export function HousingCostCard({ data }: { data: HomeDashboard }) {
  const home = data.home;
  if (!home) return null;
  const cost = monthlyHousingCost(home);
  return (
    <Link href="/my/home" className={`${styles.card} ${styles.span2}`}>
      <span className={styles.cardLabel}>월 예상 주거비</span>
      {cost.status === "no_contract" ? (
        <span className={styles.muted}>내 집 화면에 월세·관리비를 넣으면 계산합니다.</span>
      ) : (
        <>
          <span className={`${styles.number} tabular-nums`}>{won(cost.total)}</span>
          <div className={styles.bar} aria-hidden="true">
            <span className={styles.barRent} style={{ flexGrow: Math.max(cost.rent, 1) }} />
            {cost.fee ? <span className={styles.barFee} style={{ flexGrow: cost.fee }} /> : null}
          </div>
          <span className={`${styles.muted} tabular-nums`}>
            <span className={styles.keyRent}>■</span> 월세 {won(cost.rent)}
            {cost.fee === null ? " · 관리비를 넣으면 더 정확합니다" : <> · <span className={styles.keyFee}>■</span> 관리비 {won(cost.fee)}</>}
          </span>
        </>
      )}
    </Link>
  );
}

/** ③ 주거환경 분석: 지금 습도(큰 숫자)·결로 위험 상태·최근 습도 추이 */
export function EnvironmentCard({ data, now }: { data: HomeDashboard; now: Date }) {
  if (!data.home) return null;
  const measured = data.latestMeasurement;
  const state = measurementState(measured?.measuredAt ?? null, now);
  return (
    <section className={`${styles.card} ${styles.span2}`} aria-labelledby="env-title">
      <h2 id="env-title" className={styles.cardLabel}>주거환경 분석 현황</h2>
      {state === "none" || !measured ? (
        <Link href="/my/home" className={styles.headline}>실내 온습도를 입력해 주세요</Link>
      ) : (
        <div className={styles.envRow}>
          <span className={`${styles.number} tabular-nums`}>{measured.humidityPct}%</span>
          <span className={styles.muted}>실내 습도 · {measured.temperatureC}°C<br />{kst(measured.measuredAt)}{state === "stale" ? <strong> · 오래된 측정값</strong> : null}</span>
        </div>
      )}
      {data.openRisk ? (
        <Link href={`/incidents/${data.openRisk.id}`} className={styles.riskChip}>
          위험 · {data.openRisk.title} ({describeRiskTime(data.openRisk.riskAt, now).remaining})
        </Link>
      ) : (
        <span className={styles.muted}>{environmentLine({ state, lastCheckAt: data.lastWeatherCheckAt ? kst(data.lastWeatherCheckAt) : null })}</span>
      )}
      {data.measurements.length > 1 ? <HumidityTrend measurements={data.measurements} compact /> : null}
    </section>
  );
}

/** ④ 새 위험·주거 기회 [GLOSSARY 사건] */
export function AlertsCard({ data }: { data: HomeDashboard }) {
  return (
    <section className={styles.card} aria-labelledby="alerts-title">
      <h2 id="alerts-title" className={styles.cardLabel}>새 위험·주거 기회</h2>
      <Link href="/incidents?status=new" className={styles.pair}>
        <span><span className={`${styles.number} tabular-nums`}>{data.alerts.newRisk}</span><br />새 위험</span>
        <span><span className={`${styles.number} tabular-nums`}>{data.alerts.newOpportunity}</span><br />새 주거 기회</span>
      </Link>
      {data.hasCondition ? (
        <Link href="/notices" className="tabular-nums">정할 맞춤 공고 <strong>{data.toDecide}</strong>건</Link>
      ) : (
        <Link href="/onboarding">공고 조건을 넣으면 맞춤 공고를 보여 드립니다</Link>
      )}
    </section>
  );
}

/** ⑤ 승인 대기·처리 현황 */
export function DecisionCard({ data }: { data: HomeDashboard }) {
  return (
    <section className={styles.card} aria-labelledby="decision-title">
      <h2 id="decision-title" className={styles.cardLabel}>승인 대기·처리 현황</h2>
      <span className={`${styles.number} tabular-nums`}>{data.alerts.pending}</span>
      <span className={`${styles.muted} tabular-nums`}>최근 30일 승인 {data.recent.approved} · 거절 {data.recent.rejected}</span>
      {data.alerts.pending > 0 ? <Link href="/incidents?status=pending" className={styles.cta}>승인하러 가기</Link> : null}
    </section>
  );
}

/** 최근 알림 타임라인 */
export function TimelineCard({ data }: { data: HomeDashboard }) {
  return (
    <section className={`${styles.card} ${styles.span2}`} aria-labelledby="timeline-title">
      <h2 id="timeline-title" className={styles.cardLabel}>최근 위험·기회 알림</h2>
      {data.recentAlerts.length === 0 ? (
        <span className={styles.muted}>아직 알림이 없습니다.</span>
      ) : (
        <ol className={styles.timeline}>
          {data.recentAlerts.map((alert) => (
            <li key={alert.id}>
              <span className={styles.kind}>{alert.kind === "risk" ? "위험" : "주거 기회"}</span>
              <Link href={`/incidents/${alert.id}`}>{alert.title}</Link>
              <span className={styles.timelineMeta}>{isIncidentStatus(alert.status) ? <StatusBadge status={alert.status} /> : null} {kst(alert.detectedAt)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** 다가오는 일정 */
export function ScheduleCard({ data, today }: { data: HomeDashboard; today: string }) {
  return (
    <section className={`${styles.card} ${styles.span2}`} aria-labelledby="schedule-title">
      <h2 id="schedule-title" className={styles.cardLabel}>다가오는 일정</h2>
      {data.schedule.length === 0 ? (
        <span className={styles.muted}>알림의 계획을 승인하면 여기에 일정이 생깁니다.</span>
      ) : (
        <ul className={styles.list}>
          {data.schedule.map((item) => (
            <li key={item.id}>
              <Link href={`/schedule/${item.id}`}>{item.title}</Link>{" "}
              <span className={styles.muted}>{describeDeadline(item.dueDate, today) ?? "마감일 없음"}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
