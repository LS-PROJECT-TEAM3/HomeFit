import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Empty, LoadError, Loading } from "@/app/_components/states";
import { isIncidentStatus, SimulatedBadge, StatusBadge, UpdatedBadge } from "@/app/_components/status";
import { describeDeadline } from "@/incident/checklist";
import { parseIncidentFilter, type IncidentFilter } from "@/incident/filter";
import { listIncidents, myhomeCollectionStatus } from "@/incident/queries.server";
import { toKstDate } from "@/watch/kst";
import styles from "./incidents.module.css";

export const metadata = { title: "사건 | HomeFit AI" };

const STATUS_OPTIONS = [
  ["all", "전체"], ["new", "새 사건"], ["pending", "승인 대기"], ["approved", "승인"], ["rejected", "거절"],
] as const;
const PERIOD_OPTIONS = [["all", "전체 기간"], ["7d", "최근 7일"], ["30d", "최근 30일"]] as const;

function formatTime(iso: string | null): string {
  if (!iso) return "아직 없음";
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" });
}

async function IncidentList({ filter }: { filter: IncidentFilter }) {
  await connection(); // 현재 시각으로 기간을 계산하므로 요청 때 그린다
  let result;
  try {
    const now = new Date();
    result = { incidents: await listIncidents(filter, now), status: await myhomeCollectionStatus(), today: toKstDate(now) };
  } catch {
    return <LoadError>사건을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
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
              맞는 공고에 아직 변화가 없습니다. 마지막 확인: {formatTime(status.lastSuccessAt)}.{" "}
              <Link href="/notices">맞는 공고 보기</Link>
            </>
          ) : (
            "거른 조건에 맞는 사건이 없습니다."
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
                <span className={styles.meta}>
                  {incident.facts.supplyType ?? "공급 유형 공고문 확인"} · {describeDeadline(incident.facts.applyEnd, today) ?? "마감일: 공고문 확인"}
                </span>
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
  return (
    <>
      {/* FR-008: GET 폼이라 거르기 값이 주소에 남아 새로고침해도 유지된다 */}
      <form className={styles.filters} method="get">
        <label>
          상태{" "}
          <select name="status" defaultValue={filter.status} className={styles.select}>
            {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          기간{" "}
          <select name="period" defaultValue={filter.period} className={styles.select}>
            {PERIOD_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <button type="submit" className={styles.apply}>거르기</button>
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
      <h1 className={styles.title}>사건</h1>
      <Suspense fallback={<Loading />}>
        <Filtered searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
