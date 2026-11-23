import type { RentFacts } from "@/incident/rent-detect";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoadError, Loading } from "@/app/_components/states";
import { summarizeChange } from "@/incident/change-text";
import { describeDeadline } from "@/incident/checklist";
import type { HumidityFacts } from "@/incident/humidity-detect";
import { parseIncidentFilter, type IncidentFilter } from "@/incident/filter";
import { listIncidents, myhomeCollectionStatus } from "@/incident/queries.server";
import { toKstDate } from "@/watch/kst";
import styles from "../notices/notices.module.css";

export const metadata = { title: "알림 | HomeFit AI" };

// spec 022: 알림 목록은 v2 보드가 없어 맞춤 공고 목록(v2-s3-pc)과 같은 모양으로 맞춘다(가운데 제목, 상태 칩, 흰 줄)
const STATUS_BADGE: Record<string, [string, string]> = {
  new: ["새 알림", styles.badgeNew], pending: ["승인 대기", styles.badgePending], approved: ["승인함", styles.badgeFollow], rejected: ["거절함", styles.badgeDeadline],
};
const kst = (iso: string) => new Date(iso).toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }).slice(5, 16).replace("-", ".");

const STATUS_OPTIONS = [
  ["all", "전체"], ["new", "새 알림"], ["pending", "승인 대기"], ["approved", "승인"], ["rejected", "거절"],
] as const;
const PERIOD_OPTIONS = [["all", "전체 기간"], ["7d", "최근 7일"], ["30d", "최근 30일"]] as const;

function formatTime(iso: string | null): string {
  if (!iso) return "아직 없음";
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" });
}

// FR-006 (spec 003): 습도·결로 사건 한 줄. 추정값은 "추정"이라고 밝힌다
// spec 008 FR-006: 시세 알림 한 줄(가장 크게 바뀐 값과 거래 수)
function RentLine({ facts }: { facts: RentFacts }) {
  return (
    <>
      <span className={styles.rowMeta}>
        {facts.diffs.map((d) => `${d.field === "monthlyRent" ? "월세" : "보증금"} ${d.percent > 0 ? "+" : ""}${d.percent}%`).join(" / ")}
      </span>
      <span className={styles.rowMeta}>주변 전월세 시세 / 실거래 {facts.count}건({facts.months[0]}~{facts.months[1]})</span>
    </>
  );
}

function HumidityLine({ facts, today }: { facts: HumidityFacts; today: string }) {
  return (
    <>
      <span className={styles.rowMeta}>
        창 표면 {facts.surfaceC.toFixed(1)}°C(추정) / 이슬점 {facts.dewPointC.toFixed(1)}°C / 바깥 {facts.outdoorC}°C
      </span>
      <span className={styles.rowMeta}>습도·결로 위험 / 할 일 {describeDeadline(facts.dueDate, today) ?? facts.dueDate}</span>
    </>
  );
}

async function IncidentList({ filter }: { filter: IncidentFilter }) {
  await connection(); // 현재 시각으로 기간을 계산하므로 요청 때 그린다
  let result;
  try {
    const now = new Date();
    result = { incidents: await listIncidents(filter, now), status: await myhomeCollectionStatus(), today: toKstDate(now) };
  } catch {
    return <LoadError>알림을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  const { incidents, status, today } = result;
  return (
    <>
      {status.lastStatus === "failed" ? (
        <LoadError>오늘 공고를 불러오지 못했습니다. 다음 수집 때 다시 확인합니다.</LoadError>
      ) : null}
      {incidents.length === 0 ? (
        <section className={styles.emptyCard}>
          {filter.status === "all" && filter.period === "all" ? (
            <>
              {/* FR-015 (spec 001 v0.2): 처음 보이는 공고는 사건이 아니라 맞는 공고에 있다 */}
              <h2 className={styles.emptyTitle}>아직 새 알림이 없어요</h2>
              <p className={styles.emptyText}>팔로우한 맞춤 공고와 내 집에 변화가 생기면 여기에 알려 드려요. 마지막 확인: {formatTime(status.lastSuccessAt)}</p>
              <Link href="/notices" className={styles.emptyLink}>맞춤 공고 보기</Link>
            </>
          ) : <p className={styles.emptyText}>이 조건에 맞는 알림이 없어요.</p>}
        </section>
      ) : (
        <ul className={styles.rows}>
          {incidents.map((incident) => {
            const badge = STATUS_BADGE[incident.status];
            const risk = Boolean(incident.rent || incident.humidity);
            return (
              <li key={incident.id}>
                <Link href={`/incidents/${incident.id}`} className={`${styles.row} ${styles.rowLink}`}>
                  <span className={styles.rowMain}>
                    <span className={styles.badges}>
                      <span className={`${styles.badge} ${risk ? styles.badgeRisk : styles.badgeMuted}`}>{risk ? "위험" : "주거 기회"}</span>
                      {badge ? <span className={`${styles.badge} ${badge[1]}`}>{badge[0]}</span> : null}
                      {incident.isUpdated ? <span className={`${styles.badge} ${styles.badgeIgnored}`}>내용 바뀜</span> : null}
                      {incident.isSimulated ? <span className={`${styles.badge} ${styles.badgeIgnored}`}>시뮬레이션</span> : null}
                    </span>
                    <span className={styles.rowTitle}>{incident.facts.title}</span>
                    {incident.rent ? <RentLine facts={incident.rent} /> : incident.humidity ? (
                      <HumidityLine facts={incident.humidity} today={today} />
                    ) : (
                      <>
                        {/* FR-008 수용 기준 3 (spec 001 v0.4): 무엇이 바뀌었는지 한 줄 */}
                        <span className={styles.rowMeta}>{summarizeChange(incident.facts.change)}</span>
                        <span className={styles.rowMeta}>
                          {incident.facts.supplyType ?? "공급 유형 공고문 확인"}<span className={styles.bar} aria-hidden="true">|</span>{describeDeadline(incident.facts.applyEnd, today) ?? "마감일 공고문 확인"}
                        </span>
                      </>
                    )}
                  </span>
                  <span className={styles.rowDue}><span className={styles.rowDate}>{kst(incident.detectedAt)} 확인</span></span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

async function Filtered({ searchParams }: { searchParams: PageProps<"/incidents">["searchParams"] }) {
  const filter = parseIncidentFilter(await searchParams);
  const tabHref = (status: string, period: string) => {
    const q = new URLSearchParams();
    if (status !== "all") q.set("status", status);
    if (period !== "all") q.set("period", period);
    return q.size ? `/incidents?${q.toString()}` : "/incidents";
  };
  return (
    <>
      {/* spec 004 v0.2: 상태로 거르기(기획안 Incident Center). 필터 값은 주소에 남는다(FR-008) */}
      <nav className={`${styles.filters} ${styles.statusNav}`} aria-label="알림 상태">
        {STATUS_OPTIONS.map(([value, label]) => (
          <Link key={value} href={tabHref(value, filter.period)} className={`${styles.filter} ${filter.status === value ? styles.filterOn : ""}`} aria-current={filter.status === value ? "page" : undefined}>{label}</Link>
        ))}
      </nav>
      <form className={styles.periodForm} method="get">
        {filter.status !== "all" ? <input type="hidden" name="status" value={filter.status} /> : null}
        <label htmlFor="period" className={styles.popLabel}>기간</label>
        <select id="period" name="period" defaultValue={filter.period} className={`${styles.popInput} ${styles.periodSelect}`}>
          {PERIOD_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button type="submit" className={styles.selectButton}>적용</button>
      </form>
      <Suspense fallback={<Loading />}>
        <IncidentList filter={filter} />
      </Suspense>
    </>
  );
}

// IA IC_020000_PG 사건 (FR-004, FR-008, FR-015, spec 001). 메뉴 이름 "알림"(IA v1.17)
export default function IncidentsPage({ searchParams }: PageProps<"/incidents">) {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>알림</h1>
      <span className={styles.titleLine} aria-hidden="true" />
      <Suspense fallback={<Loading />}>
        <Filtered searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
