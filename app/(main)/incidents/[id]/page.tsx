import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoadError, Loading } from "@/app/_components/states";
import { isIncidentStatus, SimulatedBadge, StatusBadge, UpdatedBadge } from "@/app/_components/status";
import { describeDeadline } from "@/incident/checklist";
import { getIncidentDetail, type IncidentDetail } from "@/incident/queries.server";
import { createClient, currentUserId } from "@/lib/supabase/server";
import { toKstDate } from "@/watch/kst";
import { DecisionPanel } from "./decision-panel";
import styles from "./detail.module.css";

export const metadata = { title: "사건 상세 | HomeFit AI" };

function Facts({ detail, today }: { detail: IncidentDetail; today: string }) {
  const facts = detail.facts;
  const deadline = describeDeadline(facts.applyEnd, today);
  return (
    <section className={styles.card} aria-labelledby="facts-title">
      <h2 id="facts-title" className={styles.sectionTitle}>공고 원문 값</h2>
      <p className={styles.deadline}>
        신청 마감: <strong>{facts.applyEnd ?? "공고문 확인"}</strong>
        {deadline ? <span className={styles.deadlineBadge}>{deadline}</span> : null}
      </p>
      <dl className={styles.facts}>
        <dt>공급 유형</dt><dd>{facts.supplyType ?? "공고문 확인"}</dd>
        <dt>접수 기간</dt><dd>{facts.applyStart ?? "?"} ~ {facts.applyEnd ?? "?"}</dd>
        <dt>월 임대료</dt><dd className="tabular-nums">{facts.monthlyRent ? `${facts.monthlyRent.toLocaleString("ko-KR")}원부터` : "공고문 확인"}</dd>
        <dt>공고일</dt><dd>{facts.announcedOn ?? "공고문 확인"}</dd>
      </dl>
      <p className={styles.notice}>자격은 공고문 기준으로 확인이 필요합니다.</p>
      {facts.url ? <a href={facts.url} target="_blank" rel="noopener noreferrer">공고 원문 보기 (마이홈)</a> : null}
      <p className={styles.source}>출처: 마이홈 공공임대 모집공고 · 수집 {new Date(detail.detectedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</p>
    </section>
  );
}

function Plan({ detail }: { detail: IncidentDetail }) {
  const plan = detail.plan;
  return (
    <section className={styles.card} aria-labelledby="plan-title">
      <h2 id="plan-title" className={styles.sectionTitle}>신청 준비 계획 (초안)</h2>
      {plan?.aiOk && plan.summary ? (
        <>
          <p>{plan.summary}</p>
          <p className={styles.source}>AI 요약 · 근거: 위 공고 원문 값{plan.citations[0] ? ` (${plan.citations[0].label})` : ""}</p>
        </>
      ) : (
        <p className={styles.notice}>요약을 만들지 못했습니다. 원문을 확인해 주세요.</p>
      )}
      <ul className={styles.checklist}>
        {(plan?.checklist ?? []).map((item, i) => (
          <li key={i}>{item.label}{item.dueOn ? <span className={styles.due}> (마감 {item.dueOn})</span> : null}</li>
        ))}
      </ul>
    </section>
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
      await (await createClient()).rpc("mark_incident_viewed", { p_incident_id: id });
      detail = { ...detail, status: "pending" };
    }
  } catch {
    return <LoadError>사건을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  if (!detail) return <LoadError>볼 수 없는 페이지입니다. <Link href="/">홈으로</Link></LoadError>;
  const open = detail.status === "new" || detail.status === "pending";
  return (
    <>
      <div className={styles.badges}>
        {isIncidentStatus(detail.status) ? <StatusBadge status={detail.status} /> : null}
        {detail.isUpdated ? <UpdatedBadge /> : null}
        {detail.isSimulated ? <SimulatedBadge /> : null}
      </div>
      <h1 className={styles.title}>{detail.facts.title}</h1>
      <Facts detail={detail} today={toKstDate(new Date())} />
      <Plan detail={detail} />
      {/* FR-011: 관리자도 남의 사건은 승인·거절하지 못한다 */}
      {detail.isMine && open ? <DecisionPanel incidentId={detail.id} /> : null}
      {detail.status === "approved" && detail.scheduleId ? (
        <p className={styles.success} role="status">
          내 일정에 넣었습니다. <Link href={`/schedule/${detail.scheduleId}`}>일정 보기</Link>
        </p>
      ) : null}
      {detail.status === "rejected" ? <p className={styles.success} role="status">거절했습니다. 일정은 바뀌지 않았습니다.</p> : null}
      {detail.actions.map((action, i) => (
        <p key={i} className={styles.source}>
          처리 이력: {action.action === "approve" ? "승인" : `거절 (사유: ${action.reason ?? ""})`} · {new Date(action.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
        </p>
      ))}
    </>
  );
}

// IA IC_020100_PG 사건 상세 (FR-009, FR-010, spec 001). MOT: 무엇을 언제까지 해야 하는지 바로 보이게
export default function IncidentDetailPage({ params }: PageProps<"/incidents/[id]">) {
  return (
    <main className={styles.main}>
      <p><Link href="/incidents">← 사건 목록</Link></p>
      <Suspense fallback={<Loading />}>
        <Detail params={params} />
      </Suspense>
    </main>
  );
}
