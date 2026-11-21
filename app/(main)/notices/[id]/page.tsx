import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { Icon } from "@/app/_components/icons";
import { LoadError, Loading } from "@/app/_components/states";
import { changeHeadline, summarizeChange } from "@/incident/change-text";
import { describeDeadline } from "@/incident/checklist";
import { noticeComplexes } from "@/incident/matched";
import { getNoticeDetail, type NoticeDetail, type NoticeIncident } from "@/incident/notices.server";
import { getOrCreateNoticeSummary } from "@/incident/notice-summary.server";
import { noticeRentDelta } from "@/incident/real-cost";
import { toKstDate } from "@/watch/kst";
import { currentUserId } from "@/lib/supabase/server";
import { loadMyHome } from "../../my/home/load";
import { regionLabel, sigunguNames } from "../listing-data";
import { DetailTabs } from "./detail-tabs";
import { FollowPanel } from "./follow-panel";
import styles from "./detail.module.css";

export const metadata = { title: "공고 상세 | HomeFit AI" };

type Notice = NoticeDetail["notices"][number];

const won = (value: number | null) => (value === null ? "공고문 확인" : `${value.toLocaleString("ko-KR")}원`);
const dot = (date: string | null) => (date ? date.slice(5).replace("-", ".") : "?");
const kstShort = (iso: string) => new Date(iso).toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }).slice(5, 16).replace("-", ".");

function lowestRent(notices: readonly Notice[]): number | null {
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
  const text = delta === 0 ? "내 집 월세와 같아요" : `내 집보다 한 달 ${Math.abs(delta).toLocaleString("ko-KR")}원 ${delta > 0 ? "더 들어요" : "덜 들어요"}`;
  return <Kv label="내 집과" value={<>{text} <Link href="/compare" className={styles.inlineLink}>실질 주거비 비교</Link></>} />;
}

function Kv({ label, value }: { label: string; value: ReactNode }) {
  return <div className={styles.kv}><span className={styles.kvKey}>{label}</span><span className={styles.kvValue}>{value}</span></div>;
}

/** 핵심 요약의 한 묶음(왼쪽 질문 220px, 오른쪽 큰 값 + 세부 줄) */
function Block({ question, lead, children }: { question: string; lead: ReactNode; children?: ReactNode }) {
  return (
    <div className={styles.block}>
      <h3 className={styles.blockQuestion}>{question}</h3>
      <div>
        <p className={styles.blockLead}>{lead}</p>
        {children ? <div className={styles.blockRows}>{children}</div> : null}
      </div>
    </div>
  );
}

// FR-021 (spec 001 v0.5): 처음 열 때 AI가 한 번 만들고 저장, 그 뒤로는 저장된 요약
async function AiSummary({ announcementId, notice }: { announcementId: string; notice: Notice }) {
  const result = await getOrCreateNoticeSummary(announcementId, notice).catch(() => null);
  if (!result) return <p className={styles.aiText}>요약을 만들지 못했어요. 아래 공고 원문 값을 확인해 주세요.</p>;
  return <p className={styles.aiText}>{result.summary}{result.isMock ? <span className={styles.mock}> (시험용 mock 요약)</span> : null}</p>;
}

function SummaryPanel({ announcementId, detail, today }: { announcementId: string; detail: NoticeDetail; today: string }) {
  const [notice] = detail.notices;
  const deadline = describeDeadline(notice.applyEnd, today);
  const complexes = noticeComplexes(detail.notices);
  return (
    <section className={styles.card} aria-labelledby="sum-title">
      <div className={styles.cardHead}>
        <h2 id="sum-title" className={styles.cardTitle}>공고 핵심 요약</h2>
        <span className={styles.source}>AI 요약<span className={styles.bar} aria-hidden="true">|</span>출처: 공고 원문</span>
      </div>
      <Suspense fallback={<p className={styles.aiText} role="status">요약을 만드는 중…</p>}>
        <AiSummary announcementId={announcementId} notice={notice} />
      </Suspense>
      {/* 자격은 판정하지 않는다(CLAUDE.md 하지 않을 것) */}
      <Block question="누가 신청할 수 있나요" lead="공고문에서 확인해 주세요"><Kv label="자격" value="HomeFit은 신청 자격을 판정하지 않아요" /></Block>
      <Block question="언제 신청하나요" lead={<>{dot(notice.applyStart)} ~ {dot(notice.applyEnd)} 접수{deadline ? <span className={styles.leadTag}>{deadline}</span> : null}</>}>
        <Kv label="접수 시작" value={notice.applyStart ?? "공고문 확인"} />
        <Kv label="접수 마감" value={notice.applyEnd ?? "공고문 확인"} />
        {notice.statusName ? <Kv label="공고 상태" value={notice.statusName} /> : null}
      </Block>
      <Block question="어떤 집을 공급하나요" lead={notice.supplyType ?? "공급 유형 공고문 확인"}>
        <Kv label="단지" value={`${complexes.length}곳`} />
      </Block>
      <Block question="비용" lead={`월 임대료 ${won(lowestRent(detail.notices))}${lowestRent(detail.notices) === null ? "" : "부터"}`}>
        <Kv label="보증금" value="공고문 확인" />
        <Suspense fallback={null}><MyHomeDelta noticeRent={lowestRent(detail.notices)} /></Suspense>
      </Block>
    </section>
  );
}

async function ComplexPanel({ detail }: { detail: NoticeDetail }) {
  const complexes = noticeComplexes(detail.notices);
  const names = await sigunguNames(detail.notices[0].sidoCode ?? "");
  const lowest = Math.min(...complexes.map((c) => c.monthlyRent ?? Infinity));
  return (
    <section className={styles.card} aria-labelledby="complex-title">
      <div className={styles.cardHead}>
        <h2 id="complex-title" className={styles.cardTitle}>단지별 월 임대료</h2>
        <span className={styles.source}>출처: 공고 원문</span>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th scope="col">단지</th><th scope="col">지역</th><th scope="col" className={styles.num}>월 임대료</th></tr></thead>
          <tbody>
            {complexes.map((c) => (
              <tr key={c.externalId}>
                <th scope="row">{c.name}{c.monthlyRent !== null && c.monthlyRent === lowest && complexes.length > 1 ? <span className={`${styles.badge} ${styles.badgeFollow}`}>가장 낮음</span> : null}</th>
                <td>{regionLabel(detail.notices[0].sidoCode ?? "", c.sigunguCode, names) || "공고문 확인"}</td>
                <td className={styles.num}>{won(c.monthlyRent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const DONE: Record<string, [string, string]> = { approved: ["승인함", styles.approved], rejected: ["거절함", styles.rejected] };

function AlertsPanel({ incidents }: { incidents: NoticeIncident[] }) {
  const waiting = incidents.filter((i) => !(i.status in DONE));
  const done = incidents.filter((i) => i.status in DONE);
  return (
    <>
      <section className={styles.card} aria-labelledby="waiting-title">
        <h2 id="waiting-title" className={styles.cardTitle}>확인할 알림{waiting.length ? <> <span className={styles.caution}>{waiting.length}</span>건</> : null}</h2>
        {waiting.length === 0 ? <p className={styles.empty}>{incidents.length === 0 ? "아직 없어요. 공고가 바뀌면 여기에 알려드려요." : "승인 대기 중인 알림은 없어요."}</p> : (
          <>
            <p className={styles.help}>공고 원문에서 확인한 변화예요. 확인하기를 누르면 알림 상세에서 승인하거나 거절해요.</p>
            {waiting.map((i) => (
              <article key={i.id} className={styles.alertCard}>
                <div className={styles.alertTop}><span className={`${styles.badge} ${styles.badgePending}`}>승인 대기</span><span className={styles.alertTime}>{kstShort(i.detectedAt)} 확인</span></div>
                <h3 className={styles.alertTitle}>{changeHeadline(i.change)}</h3>
                <div className={styles.alertFoot}>
                  <p className={styles.alertChange}>{summarizeChange(i.change)}</p>
                  <Link href={`/incidents/${i.id}`} className={styles.buttonPrimary}>확인하기</Link>
                </div>
              </article>
            ))}
          </>
        )}
      </section>
      <section className={styles.card} aria-labelledby="done-title">
        <h2 id="done-title" className={styles.cardTitle}>처리한 알림{done.length ? ` ${done.length}건` : ""}</h2>
        {done.length === 0 ? <p className={styles.empty}>아직 없어요.</p> : (
          <ul className={styles.doneList}>
            {done.map((i) => (
              <li key={i.id}>
                <Link href={`/incidents/${i.id}`} className={styles.doneRow}>
                  <span className={styles.doneMain}><span className={styles.doneTitle}>{changeHeadline(i.change)}</span><span className={styles.doneChange}>{summarizeChange(i.change)}</span></span>
                  <b className={DONE[i.status][1]}>{DONE[i.status][0]}</b>
                  <span className={styles.doneDate}>{i.closedAt ? kstShort(i.closedAt).slice(0, 5) : "-"}</span>
                  <Icon name="chevron-right" size={18} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
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
  const waiting = detail.myIncidents.filter((i) => !(i.status in DONE)).length;
  return (
    <>
      <FollowPanel announcementId={announcementId} title={notice.title} announcedOn={notice.announcedOn} url={notice.url} initial={detail.myDecision}
        initialScheduleId={detail.myScheduleId} expired={notice.applyEnd !== null && notice.applyEnd < today} simulated={announcementId.startsWith("SIM-")} />
      <DetailTabs tabs={[
        { key: "sum", label: "핵심 요약", panel: <SummaryPanel announcementId={announcementId} detail={detail} today={today} /> },
        { key: "complex", label: "단지별 월 임대료", panel: <ComplexPanel detail={detail} /> },
        { key: "alerts", label: "내 알림", count: waiting, panel: <AlertsPanel incidents={detail.myIncidents} /> },
      ]} />
    </>
  );
}

// IA NT_080100_PG 공고 상세 (FR-017 수용 기준 4·5, FR-020, FR-021, spec 001 v0.5, spec 022 캔버스 v2-s4-*). 승인은 팔로우. 일정은 팔로우 뒤 따로 눌러 넣는다(spec 007)
export default function NoticeDetailPage({ params }: PageProps<"/notices/[id]">) {
  return (
    <main className={styles.main}>
      <nav aria-label="현재 위치" className={styles.crumb}>
        <Link href="/">홈</Link><span aria-hidden="true">›</span><Link href="/notices">맞춤 공고</Link><span aria-hidden="true">›</span><span aria-current="page">공고 상세</span>
      </nav>
      <Suspense fallback={<Loading />}>
        <Detail params={params} />
      </Suspense>
    </main>
  );
}
