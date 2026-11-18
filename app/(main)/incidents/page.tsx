import type { RentFacts } from "@/incident/rent-detect";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { SectionTabs } from "@/app/_components/section-tabs";
import { Empty, LoadError, Loading } from "@/app/_components/states";
import { isIncidentStatus, SimulatedBadge, StatusBadge, UpdatedBadge } from "@/app/_components/status";
import { summarizeChange } from "@/incident/change-text";
import { describeDeadline } from "@/incident/checklist";
import type { HumidityFacts } from "@/incident/humidity-detect";
import { parseIncidentFilter, type IncidentFilter } from "@/incident/filter";
import { listIncidents, myhomeCollectionStatus } from "@/incident/queries.server";
import { toKstDate } from "@/watch/kst";
import styles from "./incidents.module.css";

export const metadata = { title: "위험·기회 알림 | HomeFit AI" };

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
      <span className={styles.change}>
        {facts.diffs.map((d) => `${d.field === "monthlyRent" ? "월세" : "보증금"} ${d.percent > 0 ? "+" : ""}${d.percent}%`).join(" · ")}
      </span>
      <span className={styles.meta}>주변 전월세 시세 · 실거래 {facts.count}건({facts.months[0]}~{facts.months[1]})</span>
    </>
  );
}

function HumidityLine({ facts, today }: { facts: HumidityFacts; today: string }) {
  return (
    <>
      <span className={styles.change}>
        창 표면 {facts.surfaceC.toFixed(1)}°C(추정) · 이슬점 {facts.dewPointC.toFixed(1)}°C · 바깥 {facts.outdoorC}°C
      </span>
      <span className={styles.meta}>습도·결로 위험 · 할 일 {describeDeadline(facts.dueDate, today) ?? facts.dueDate}</span>
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
        <Empty>
          {filter.status === "all" && filter.period === "all" ? (
            <>
              {/* FR-015 (spec 001 v0.2): 처음 보이는 공고는 사건이 아니라 맞는 공고에 있다 */}
              팔로우한 맞춤 공고와 내 집에 아직 새 알림이 없습니다. 마지막 확인: {formatTime(status.lastSuccessAt)}.{" "}
              <Link href="/notices">맞춤 공고 보기</Link>
            </>
          ) : (
            "필터 조건에 맞는 알림이 없습니다."
          )}
        </Empty>
      ) : (
        <ul className={styles.list}>
          {incidents.map((incident) => (
            <li key={incident.id}>
              <Link href={`/incidents/${incident.id}`} className={styles.item}>
                <span className={styles.badges}>
                  {isIncidentStatus(incident.status) ? <StatusBadge status={incident.status} /> : null}
                  {incident.isUpdated ? <UpdatedBadge /> : null}
                  {incident.isSimulated ? <SimulatedBadge /> : null}
                </span>
                <span className={styles.itemTitle}>{incident.facts.title}</span>
                {incident.rent ? <RentLine facts={incident.rent} /> : incident.humidity ? (
                  <HumidityLine facts={incident.humidity} today={today} />
                ) : (
                  <>
                    {/* FR-008 수용 기준 3 (spec 001 v0.4): 무엇이 바뀌었는지 한 줄 */}
                    <span className={styles.change}>{summarizeChange(incident.facts.change)}</span>
                    <span className={styles.meta}>
                      {incident.facts.supplyType ?? "공급 유형 공고문 확인"} · {describeDeadline(incident.facts.applyEnd, today) ?? "마감일: 공고문 확인"}
                    </span>
                  </>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

async function Filtered({ searchParams }: { searchParams: PageProps<"/incidents">["searchParams"] }) {
  const filter = parseIncidentFilter(await searchParams);
  const tabHref = (status: string) => (status === "all" ? "/incidents" : `/incidents?status=${status}`);
  return (
    <>
      {/* spec 004 v0.2: 상태는 탭으로(기획안 Incident Center: 새 알림·승인 대기·처리 이력). 필터 값은 주소에 남는다(FR-008) */}
      <SectionTabs label="알림 상태" tabs={STATUS_OPTIONS.map(([value, label]) => ({ href: tabHref(value), label }))} activeHref={tabHref(filter.status)} />
      <form className={styles.filters} method="get">
        {filter.status !== "all" ? <input type="hidden" name="status" value={filter.status} /> : null}
        <label>
          기간{" "}
          <select name="period" defaultValue={filter.period} className={styles.select}>
            {PERIOD_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <button type="submit" className={styles.apply}>필터 적용</button>
      </form>
      <Suspense fallback={<Loading />}>
        <IncidentList filter={filter} />
      </Suspense>
    </>
  );
}

// IA IC_020000_PG 사건 (FR-004, FR-008, FR-015, spec 001)
export default function IncidentsPage({ searchParams }: PageProps<"/incidents">) {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>위험·기회 알림</h1>
      <Suspense fallback={<Loading />}>
        <Filtered searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
