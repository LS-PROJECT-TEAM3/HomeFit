import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoadError, Loading } from "@/app/_components/states";
import { isIncidentStatus, SimulatedBadge, StatusBadge } from "@/app/_components/status";
import { describeDeadline } from "@/incident/checklist";
import { noticeComplexes } from "@/incident/matched";
import { getNoticeDetail, type NoticeDetail } from "@/incident/notices.server";
import { getOrCreateNoticeSummary } from "@/incident/notice-summary.server";
import { toKstDate } from "@/watch/kst";
import { fetchSigunguList } from "@/watch/region.server";
import styles from "../../incidents/[id]/detail.module.css";
import { FollowPanel } from "./follow-panel";
import { noticeRentDelta } from "@/incident/real-cost";
import { currentUserId } from "@/lib/supabase/server";
import { loadMyHome } from "../../my/home/load";

export const metadata = { title: "공고 상세 | HomeFit AI" };

function won(value: number | null): string {
  return value ? `${value.toLocaleString("ko-KR")}원부터` : "공고문 확인";
}

/** 시군구 코드 → 이름. 목록을 못 불러오면 이름 없이 둔다(화면은 그대로) */
async function sigunguNames(sidoCode: string | null): Promise<Map<string, string>> {
  if (!sidoCode) return new Map();
  try {
    return new Map((await fetchSigunguList(sidoCode)).map((s) => [s.code, s.name]));
  } catch {
    return new Map();
  }
}

function lowestRent(notices: NoticeDetail["notices"]): number | null {
  const rents = notices.map((n) => n.monthlyRent).filter((r): r is number => r !== null);
  return rents.length ? Math.min(...rents) : null;
}

// spec 009 FR-006 (문제정의 알파): 내 집 월세 대비 한 달 차이. 내 집 계약이나 공고 월세가 없으면 줄을 보이지 않는다
async function MyHomeDelta({ noticeRent }: { noticeRent: number | null }) {
  const userId = await currentUserId();
  if (!userId || noticeRent === null) return null;
  const home = await loadMyHome(userId).then((r) => r.home).catch(() => null);
  const delta = noticeRentDelta(noticeRent, home?.monthlyRent ?? null);
  if (delta === null) return null;
  const text = delta === 0 ? "내 집 월세와 같습니다" : `내 집보다 월세가 한 달 ${Math.abs(delta).toLocaleString("ko-KR")}원 ${delta > 0 ? "더 듭니다" : "덜 듭니다"}`;
  return <p className={styles.notice}><strong>{text}</strong> (공고 최저 월세 기준. 관리비·에너지비·교통비는 공고문 확인, <Link href="/compare/cost">실질 비용 비교</Link>)</p>;
}

// FR-021 (spec 001 v0.5): 처음 열 때 AI가 한 번 만들고 저장, 그 뒤로는 저장된 요약
async function Summary({ announcementId, notice }: { announcementId: string; notice: NoticeDetail["notices"][number] }) {
  const result = await getOrCreateNoticeSummary(announcementId, notice).catch(() => null);
  return (
    <section className={styles.card} aria-labelledby="summary-title">
      <h2 id="summary-title" className={styles.sectionTitle}>공고 요약</h2>
      {result ? (
        <>
          <p>{result.summary}</p>
          <p className={styles.source}>{result.isMock ? "시험용 요약(mock, 실제 AI가 쓴 글이 아님)" : "AI 요약"} · 근거: 위 공고 원문 값</p>
        </>
      ) : (
        <p className={styles.notice}>요약을 만들지 못했습니다. 원문을 확인해 주세요.</p>
      )}
    </section>
  );
}

async function Detail({ params }: { params: PageProps<"/notices/[id]">["params"] }) {
  await connection();
  const { id } = await params;
  const announcementId = decodeURIComponent(id);
  let detail: NoticeDetail | null;
  try {
    detail = await getNoticeDetail(announcementId);
  } catch {
    return <LoadError>공고를 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  if (!detail) return <LoadError>공고를 찾을 수 없습니다. <Link href="/notices">맞춤 공고로</Link></LoadError>;
  const today = toKstDate(new Date());
  const [notice] = detail.notices;
  const deadline = describeDeadline(notice.applyEnd, today);
  const complexes = noticeComplexes(detail.notices);
  const names = await sigunguNames(notice.sidoCode);
  return (
    <>
      <div className={styles.badges}>{announcementId.startsWith("SIM-") ? <SimulatedBadge /> : null}</div>
      <h1 className={styles.title}>{notice.title}</h1>
      {/* H-006 사용자 의견: 공고 원문 값 → 요약 → 팔로우 여부 → 사건 순서 */}
      <section className={styles.card} aria-labelledby="facts-title">
        <h2 id="facts-title" className={styles.sectionTitle}>공고 원문 값</h2>
        <p className={styles.deadline}>
          신청 마감: <strong>{notice.applyEnd ?? "공고문 확인"}</strong>
          {deadline ? <span className={styles.deadlineBadge}>{deadline}</span> : null}
        </p>
        <dl className={styles.facts}>
          <dt>공급 유형</dt><dd>{notice.supplyType ?? "공고문 확인"}</dd>
          <dt>접수 기간</dt><dd>{notice.applyStart ?? "?"} ~ {notice.applyEnd ?? "?"}</dd>
          <dt>월 임대료</dt><dd className="tabular-nums">{won(notice.monthlyRent)}</dd>
          <dt>공고일</dt><dd>{notice.announcedOn ?? "공고문 확인"}</dd>
          {notice.statusName ? (<><dt>공고 상태</dt><dd>{notice.statusName}</dd></>) : null}
        </dl>
        {/* spec 009 FR-006: 단지마다 월세가 달라 가장 낮은 월세로 비교한다(첫 단지에 월세가 없는 공고가 있음) */}
        <MyHomeDelta noticeRent={lowestRent(detail.notices)} />
        <p className={styles.notice}>자격은 공고문 기준으로 확인이 필요합니다.</p>
        {/* H-006: 마이홈은 바깥에서 들어오면 첫 화면이 열릴 수 있다 */}
        {notice.url ? <a href={notice.url} target="_blank" rel="noopener noreferrer">마이홈에서 원문 찾기 (첫 화면이 열릴 수 있음)</a> : null}
      </section>
      <section className={styles.card} aria-labelledby="complex-title">
        <h2 id="complex-title" className={styles.sectionTitle}>단지 {complexes.length}곳</h2>
        <ul className={styles.checklist}>
          {complexes.map((c) => (
            <li key={c.externalId}>
              {c.name}{c.sigunguCode ? ` · ${names.get(c.sigunguCode) ?? "시군구 공고문 확인"}` : ""} · <span className="tabular-nums">{won(c.monthlyRent)}</span>
            </li>
          ))}
        </ul>
      </section>
      <Suspense fallback={<section className={styles.card}><p role="status">요약을 만드는 중…</p></section>}>
        <Summary announcementId={announcementId} notice={notice} />
      </Suspense>
      <FollowPanel announcementId={announcementId} initial={detail.myDecision} initialScheduleId={detail.myScheduleId} />
      <section className={styles.card} aria-labelledby="watch-title">
        <h2 id="watch-title" className={styles.sectionTitle}>이 공고로 생긴 내 알림</h2>
        {detail.myIncidents.length === 0 ? (
          <p className={styles.notice}>아직 없습니다. 팔로우하면 이 공고의 접수 기간·임대료가 바뀌거나 정정공고가 올라올 때 주거 기회 알림으로 알려 드립니다.</p>
        ) : (
          <ul className={styles.checklist}>
            {detail.myIncidents.map((incident) => (
              <li key={incident.id}>
                <Link href={`/incidents/${incident.id}`}>알림 보기</Link>{" "}
                {isIncidentStatus(incident.status) ? <StatusBadge status={incident.status} /> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

// IA NT_080100_PG 공고 상세 (FR-017 수용 기준 4·5, FR-020, FR-021, spec 001 v0.5). 승인은 팔로우. 일정은 팔로우 뒤 따로 눌러 넣는다(spec 007)
export default function NoticeDetailPage({ params }: PageProps<"/notices/[id]">) {
  return (
    <main className={styles.main}>
      <p><Link href="/notices">← 맞춤 공고</Link></p>
      <Suspense fallback={<Loading />}>
        <Detail params={params} />
      </Suspense>
    </main>
  );
}
