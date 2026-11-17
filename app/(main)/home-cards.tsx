import Link from "next/link";
import { describeDeadline } from "@/incident/checklist";
import { contractEndText, environmentLine, measurementState, monthlyHousingCost, toPyeong } from "@/incident/home-dashboard";
import { describeRiskTime, windowTypeText } from "@/incident/humidity-text";
import { HOUSING_LABELS } from "@/incident/home-form";
import type { HomeDashboard } from "./dashboard-load";
import styles from "./page.module.css";

// spec 003 v0.2 FR-010: 홈 카드 5개. 비어 있는 카드는 지우지 않고 입력을 권하는 카드로 (IA v1.4 홈)

function won(value: number): string {
  return `${value.toLocaleString("ko-KR")}원`;
}

function kst(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function AddHomeCard() {
  return (
    <Link href="/my/home" className={`${styles.card} ${styles.wide} ${styles.callout}`}>
      <strong>내 집을 등록해 주세요</strong>
      <span>내 집을 등록하면 결로 위험과 월 예상 주거비를 알려 드립니다.</span>
    </Link>
  );
}

/** ① 나의 주거 정보 */
export function HomeInfoCard({ data, today }: { data: HomeDashboard; today: string }) {
  const home = data.home;
  if (!home) return <AddHomeCard />;
  const end = contractEndText(home.contractEndDate, today);
  return (
    <Link href="/my/home" className={`${styles.card} ${styles.wide}`} aria-label="나의 주거 정보, 내 집 화면으로">
      <span className={styles.cardLabel}>나의 주거 정보</span>
      <strong>{data.sigunguName ?? "시군구"} · {HOUSING_LABELS[home.housingType]}</strong>
      <span className="tabular-nums">전용 {home.exclusiveAreaM2}㎡ (약 {toPyeong(home.exclusiveAreaM2)}평) · 창 {windowTypeText(home.windowType)}</span>
      <span className={styles.muted}>
        {home.contractType ? (home.contractType === "monthly" ? "월세" : "전세") : "계약 형태 미입력"}
        {end ? ` · ${end}` : ""}
      </span>
    </Link>
  );
}

/** ② 월 예상 주거비 = 월세 + 관리비 [GLOSSARY 월 예상 주거비] */
export function HousingCostCard({ data }: { data: HomeDashboard }) {
  const home = data.home;
  if (!home) return null;
  const cost = monthlyHousingCost(home);
  return (
    <Link href="/my/home" className={styles.card}>
      <span className={styles.cardLabel}>월 예상 주거비</span>
      {cost.status === "no_contract" ? (
        <span className={styles.muted}>계약 정보를 넣으면 계산합니다.</span>
      ) : (
        <>
          <span className={`${styles.number} tabular-nums`}>{won(cost.total)}</span>
          <span className={`${styles.muted} tabular-nums`}>
            월세 {won(cost.rent)}{cost.fee === null ? " · 관리비를 넣으면 더 정확합니다" : ` + 관리비 ${won(cost.fee)}`}
          </span>
        </>
      )}
      <span className={styles.muted}>에너지비·교통비는 집 비교(2차)에서 더합니다.</span>
    </Link>
  );
}

/** ③ 주거환경 분석 현황: 최근 측정값과 앞으로 48시간 결로·습도 상태 */
export function EnvironmentCard({ data, now }: { data: HomeDashboard; now: Date }) {
  if (!data.home) return null;
  const measured = data.latestMeasurement;
  const state = measurementState(measured?.measuredAt ?? null, now);
  return (
    <section className={styles.card} aria-labelledby="env-title">
      <h2 id="env-title" className={styles.cardLabel}>주거환경 분석 현황</h2>
      {state === "none" || !measured ? (
        <Link href="/my/home">실내 온습도를 입력해 주세요</Link>
      ) : (
        <span className="tabular-nums">
          실내 {measured.temperatureC}°C · 습도 {measured.humidityPct}% ({kst(measured.measuredAt)})
          {state === "stale" ? <strong> · 오래된 측정값</strong> : null}
        </span>
      )}
      {data.openRisk ? (
        <Link href={`/incidents/${data.openRisk.id}`}>
          <strong>{data.openRisk.title}</strong> ({describeRiskTime(data.openRisk.riskAt, now).remaining})
        </Link>
      ) : (
        <span className={styles.muted}>{environmentLine({ state, lastCheckAt: data.lastWeatherCheckAt ? kst(data.lastWeatherCheckAt) : null })}</span>
      )}
    </section>
  );
}

/** ④ 새 위험·주거 기회 [GLOSSARY 사건: 위험 / 주거 기회] */
export function AlertsCard({ data }: { data: HomeDashboard }) {
  return (
    <section className={styles.card} aria-labelledby="alerts-title">
      <h2 id="alerts-title" className={styles.cardLabel}>새 위험·주거 기회</h2>
      <Link href="/incidents?status=new" className="tabular-nums">새 위험 <strong>{data.alerts.newRisk}</strong> · 새 주거 기회 <strong>{data.alerts.newOpportunity}</strong></Link>
      {data.hasCondition ? (
        <Link href="/notices" className="tabular-nums">정할 맞춤 공고 <strong>{data.toDecide}</strong></Link>
      ) : (
        <Link href="/onboarding">공고 조건을 넣으면 맞춤 공고를 보여 드립니다</Link>
      )}
    </section>
  );
}

/** ⑤ 승인 대기·처리 현황 */
export function DecisionCard({ data, today }: { data: HomeDashboard; today: string }) {
  return (
    <section className={`${styles.card} ${styles.wide}`} aria-labelledby="decision-title">
      <h2 id="decision-title" className={styles.cardLabel}>승인 대기·처리 현황</h2>
      <Link href="/incidents?status=pending" className="tabular-nums">승인 대기 <strong>{data.alerts.pending}</strong></Link>
      <span className={`${styles.muted} tabular-nums`}>최근 30일 승인 {data.recent.approved} · 거절 {data.recent.rejected}</span>
      {data.schedule.length === 0 ? (
        <span className={styles.muted}>알림을 승인하면 여기에 일정이 생깁니다.</span>
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
