import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/app/_components/icons";
import { LoadError, Loading } from "@/app/_components/states";
import { changeHeadline, describeChange } from "@/incident/change-text";
import { describeDeadline } from "@/incident/checklist";
import { planSteps } from "@/incident/plan-steps";
import { getIncidentDetail, type IncidentDetail } from "@/incident/queries.server";
import { createClient, currentUserId } from "@/lib/supabase/server";
import { toKstDate } from "@/watch/kst";
import { DecisionPanel, type PlanName } from "./decision-panel";
import { HumidityFactsView } from "./humidity-facts";
import { PlanFold } from "./plan-fold";
import { RentFactsView } from "./rent-facts";
import { SimilarIncidents } from "./similar";
import styles from "./alert.module.css";

export const metadata = { title: "알림 상세 | HomeFit AI" };

const kst = (iso: string) => new Date(iso).toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }).slice(5, 16).replace("-", ".");

// 알림 종류마다 계획 이름·근거 (spec 001 공고, spec 003 습도, spec 008 시세)
function planText(detail: IncidentDetail): { name: PlanName; basis: string; risk: boolean } {
  if (detail.rent) return { name: detail.rent.target === "home" ? "재계약 판단 메모" : "관심 지역 다시 보기", basis: "위 실거래 비교표", risk: true };
  if (detail.humidity) return { name: "대응 계획", basis: "위 측정값·예보·추정값", risk: true };
  return { name: "신청 준비 계획", basis: "공고 원문 값", risk: false };
}

/** FR-009 (spec 001 v0.2): 무엇이 바뀌었나. 바뀐 칸이 하나면 보드처럼 전 → 후 큰 숫자 */
function ChangeCard({ detail }: { detail: IncidentDetail }) {
  const change = detail.facts.change;
  const single = change?.kind === "changed" && change.changes.length === 1 ? change.changes[0] : null;
  const show = (v: string | number | null) => (v === null || v === "" ? "없음" : typeof v === "number" ? `${v.toLocaleString("ko-KR")}원` : String(v).replaceAll("-", "."));
  const text = describeChange(change);
  return (
    <section className={styles.card} aria-labelledby="change-title">
      <h2 id="change-title" className={styles.changeLabel}>{changeHeadline(change)}</h2>
      {single ? (
        <div className={styles.changeValues}>
          <span className={styles.changeFrom}><span className={styles.srOnly}>전 </span>{show(single.before)}</span>
          <svg className={styles.changeArrow} width="44" height="24" viewBox="0 0 44 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12h37" /><path d="M32 5l8 7-8 7" /></svg>
          <span className={styles.changeTo}><span className={styles.srOnly}>후 </span>{show(single.after)}</span>
        </div>
      ) : text ? <ul className={styles.changeLines}>{text.lines.map((line) => <li key={line}>{line}</li>)}</ul> : null}
      {text?.note ? <p className={styles.help}>{text.note}</p> : null}
      <p className={styles.source}>출처: 마이홈 공공임대 모집공고<span className={styles.bar} aria-hidden="true">|</span>{kst(detail.detectedAt)} 수집</p>
    </section>
  );
}

/** 공고 원문 값(FR-009). 보드에는 없지만 근거를 남기려고 접어 둔다 */
function Facts({ detail, today }: { detail: IncidentDetail; today: string }) {
  const facts = detail.facts;
  const deadline = describeDeadline(facts.applyEnd, today);
  return (
    <details className={styles.facts}>
      <summary className={styles.factsSummary}>공고 원문 값 보기</summary>
      <dl className={styles.factsList}>
        <div><dt>신청 마감</dt><dd>{facts.applyEnd ?? "공고문 확인"}{deadline ? ` (${deadline})` : ""}</dd></div>
        <div><dt>공급 유형</dt><dd>{facts.supplyType ?? "공고문 확인"}</dd></div>
        <div><dt>접수 기간</dt><dd>{facts.applyStart ?? "?"} ~ {facts.applyEnd ?? "?"}</dd></div>
        <div><dt>월 임대료</dt><dd>{facts.monthlyRent ? `${facts.monthlyRent.toLocaleString("ko-KR")}원부터` : "공고문 확인"}</dd></div>
        <div><dt>공고일</dt><dd>{facts.announcedOn ?? "공고문 확인"}</dd></div>
      </dl>
      <p className={styles.help}>자격은 공고문 기준으로 확인해 주세요.</p>
    </details>
  );
}

function Plan({ detail }: { detail: IncidentDetail }) {
  const plan = detail.plan;
  const text = planText(detail);
  const { steps, range } = planSteps(plan?.checklist ?? [], text.risk ? null : detail.facts.applyEnd ?? null);
  const n = steps.length;
  const title = detail.status === "approved" ? `일정 ${n}개가 내 일정에 들어갔어요` : detail.status === "rejected" ? `일정 ${n}개를 넣지 않았어요` : `일정 ${n}개가 내 일정에 새로 들어가요`;
  return (
    <PlanFold title={title} range={range} steps={steps}>
      <div className={styles.planNote}>
        <b className={styles.planName}>{text.name} (초안)</b>
        {plan?.aiOk && plan.summary ? (
          <>
            <p className={styles.planSummary}>{plan.summary}</p>
            <p className={styles.source}>{plan.isMock ? "시험용 요약(mock)" : "AI 요약"}<span className={styles.bar} aria-hidden="true">|</span>근거: {text.basis}{plan.citations[0] ? ` (${plan.citations[0].label})` : ""}</p>
          </>
        ) : <p className={styles.help}>AI 초안을 만들지 못해 기본 계획을 보여 드려요. 근거: {text.basis}</p>}
      </div>
    </PlanFold>
  );
}

/** 승인·거절 뒤 보드(v2-s6-done-pc)의 다음 알림 카드. 내 열린 알림 중 가장 최근 */
async function NextAlert({ currentId, userId }: { currentId: string; userId: string }) {
  const { data } = await (await createClient()).from("incidents").select("id, facts").eq("user_id", userId).in("status", ["new", "pending"]).neq("id", currentId).order("detected_at", { ascending: false }).limit(1);
  const next = data?.[0];
  if (!next) return null;
  return (
    <Link href={`/incidents/${next.id}`} className={styles.nextCard}>
      <span className={styles.nextLabel}>다음 알림</span>
      <span className={styles.nextTitle}>{(next.facts as { title?: string }).title ?? "알림"}</span>
      <span className={styles.nextGo}>확인하러 가기<Icon name="chevron-right" size={18} /></span>
    </Link>
  );
}

async function Detail({ params }: { params: PageProps<"/incidents/[id]">["params"] }) {
  const { id } = await params;
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  let detail: IncidentDetail | null;
  try {
    detail = await getIncidentDetail(id, userId);
    // FR-009: 처음 열면 승인 대기로 바꾸고 처음 연 시각을 남긴다(대표 KPI). 본인 사건에서만 DB 함수가 바꾼다
    if (detail?.isMine && detail.status === "new") {
      const { error } = await (await createClient()).rpc("mark_incident_viewed", { p_incident_id: id });
      if (error) throw error; // 처음 연 시각은 대표 KPI라 실패를 숨기지 않는다 (리뷰 2026-11-17)
      detail = { ...detail, status: "pending" };
    }
  } catch {
    return <LoadError>알림을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  if (!detail) return <LoadError>볼 수 없는 페이지입니다. <Link href="/">홈으로</Link></LoadError>;
  const open = detail.status === "new" || detail.status === "pending";
  const kind = detail.rent || detail.humidity ? ["위험", styles.badgeRisk] : ["주거 기회", styles.badgeChance];
  const announcementId = (detail.facts as { announcementId?: string }).announcementId;
  const rejected = detail.actions.find((a) => a.action === "reject");
  return (
    <>
      {detail.status === "approved" ? (
        <div className={styles.doneBar} role="status">
          <b>일정 {detail.plan?.checklist.length ?? 0}개를 넣었어요</b>
          {detail.scheduleId ? <Link href={`/schedule/${detail.scheduleId}`} className={styles.textLink}>내 일정 보기<Icon name="chevron-right" size={18} /></Link> : null}
        </div>
      ) : null}
      {detail.status === "rejected" ? <div className={styles.doneBar} role="status"><b>거절했어요. 일정은 바뀌지 않았어요.</b>{rejected?.reason ? <span>이유: {rejected.reason}</span> : null}</div> : null}
      <header className={styles.header}>
        <div className={styles.headerMeta}>
          <span className={`${styles.badge} ${styles.badgeLarge} ${kind[1]}`}>{kind[0]}</span>
          <span className={styles.time}>{kst(detail.detectedAt)}</span>
          {detail.status === "approved" ? <span className={`${styles.badge} ${styles.badgeApproved}`}>승인함</span> : null}
          {detail.status === "rejected" ? <span className={`${styles.badge} ${styles.badgeRejected}`}>거절함</span> : null}
          {detail.isUpdated ? <span className={`${styles.badge} ${styles.badgeMuted}`}>내용 바뀜</span> : null}
          {detail.isSimulated ? <span className={`${styles.badge} ${styles.badgeMuted}`}>시뮬레이션</span> : null}
        </div>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{detail.facts.title}</h1>
          {announcementId ? <Link href={`/notices/${encodeURIComponent(announcementId)}`} className={styles.textLink}>공고 보기<Icon name="chevron-right" size={18} /></Link> : null}
        </div>
      </header>
      {detail.rent ? <RentFactsView facts={detail.rent} /> : detail.humidity ? <HumidityFactsView facts={detail.humidity} now={new Date()} /> : (
        <>
          <ChangeCard detail={detail} />
          <Facts detail={detail} today={toKstDate(new Date())} />
        </>
      )}
      {detail.isMine && !open ? <Suspense fallback={null}><NextAlert currentId={detail.id} userId={userId} /></Suspense> : null}
      <Plan detail={detail} />
      {/* spec 010 FR-002: 내 알림에서만. 남의 알림을 보는 관리자에게는 보이지 않는다 */}
      {detail.isMine ? (
        <Suspense fallback={<Loading />}>
          <SimilarIncidents current={{ id: detail.id, incidentType: detail.incidentType, title: detail.facts.title }} userId={userId} />
        </Suspense>
      ) : null}
      {/* FR-011: 관리자도 남의 사건은 승인·거절하지 못한다 */}
      {detail.isMine && open ? <DecisionPanel incidentId={detail.id} planName={planText(detail).name} /> : null}
    </>
  );
}

// IA IC_020100_PG 사건 상세 (FR-009, FR-010, spec 001; FR-006·007, spec 003; spec 022 캔버스 v2-s6-*). MOT: 무엇을 언제까지 해야 하는지 바로 보이게
export default function IncidentDetailPage({ params }: PageProps<"/incidents/[id]">) {
  return (
    <main className={styles.main}>
      <nav aria-label="현재 위치" className={styles.crumb}>
        <Link href="/">홈</Link><span aria-hidden="true">&gt;</span><Link href="/incidents">알림</Link><span aria-hidden="true">&gt;</span><span aria-current="page">알림 상세</span>
      </nav>
      <Suspense fallback={<Loading />}>
        <Detail params={params} />
      </Suspense>
    </main>
  );
}
