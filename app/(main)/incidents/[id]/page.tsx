import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoadError, Loading } from "@/app/_components/states";
import { isIncidentStatus, SimulatedBadge, StatusBadge, UpdatedBadge } from "@/app/_components/status";
import { describeChange } from "@/incident/change-text";
import { describeDeadline } from "@/incident/checklist";
import { getIncidentDetail, type IncidentDetail } from "@/incident/queries.server";
import { createClient, currentUserId } from "@/lib/supabase/server";
import { toKstDate } from "@/watch/kst";
import { DecisionPanel } from "./decision-panel";
import { withObject } from "@/incident/korean";
import { HumidityFactsView } from "./humidity-facts";
import { RentFactsView } from "./rent-facts";
import { SimilarIncidents } from "./similar";
import type { PlanName } from "./decision-panel";
import styles from "./detail.module.css";

export const metadata = { title: "알림 상세 | HomeFit AI" };

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

// FR-009 (spec 001 v0.2): 무엇이 바뀌었나(전 → 후, 정정공고, 완화 재공고). v0.1 사건은 없음
function WhatChanged({ detail }: { detail: IncidentDetail }) {
  const text = describeChange(detail.facts.change);
  if (!text) return null;
  return (
    <section className={styles.card} aria-labelledby="change-title">
      <h2 id="change-title" className={styles.sectionTitle}>무엇이 바뀌었나</h2>
      <ul className={styles.checklist}>
        {text.lines.map((line) => <li key={line}><strong>{line}</strong></li>)}
      </ul>
      {text.note ? <p className={styles.notice}>{text.note}</p> : null}
    </section>
  );
}

// 알림 종류마다 계획 이름·근거 (spec 001 공고, spec 003 습도, spec 008 시세)
function planText(detail: IncidentDetail): { name: PlanName; basis: string; risk: boolean } {
  if (detail.rent) return { name: detail.rent.target === "home" ? "재계약 판단 메모" : "관심 지역 다시 보기", basis: "위 실거래 비교표", risk: true };
  if (detail.humidity) return { name: "대응 계획", basis: "위 측정값·예보·추정값", risk: true };
  return { name: "신청 준비 계획", basis: "위 공고 원문 값", risk: false };
}

function Plan({ detail }: { detail: IncidentDetail }) {
  const plan = detail.plan;
  const text = planText(detail);
  const humidity = text.risk;
  return (
    <section className={styles.card} aria-labelledby="plan-title">
      <h2 id="plan-title" className={styles.sectionTitle}>{text.name} (초안)</h2>
      {plan?.aiOk && plan.summary ? (
        <>
          <p>{plan.summary}</p>
          <p className={styles.source}>
            {plan.isMock ? "시험용 요약(mock, 실제 AI가 쓴 글이 아님)" : "AI 요약"} · 근거: {text.basis}{plan.citations[0] ? ` (${plan.citations[0].label})` : ""}
          </p>
        </>
      ) : (
        <p className={styles.notice}>{humidity ? `AI 초안을 만들지 못해 기본 ${withObject(text.name)} 보여 드립니다.` : "요약을 만들지 못했습니다. 원문을 확인해 주세요."}</p>
      )}
      <ul className={styles.checklist}>
        {(plan?.checklist ?? []).map((item, i) => (
          <li key={i}>{item.label}{item.dueOn ? <span className={styles.due}> ({humidity ? "할 날" : "마감"} {item.dueOn})</span> : null}</li>
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
      const { error } = await (await createClient()).rpc("mark_incident_viewed", { p_incident_id: id });
      if (error) throw error; // 처음 연 시각은 대표 KPI라 실패를 숨기지 않는다 (리뷰 2026-11-17)
      detail = { ...detail, status: "pending" };
    }
  } catch {
    return <LoadError>알림을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
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
      {detail.rent ? <RentFactsView facts={detail.rent} /> : detail.humidity ? (
        <HumidityFactsView facts={detail.humidity} now={new Date()} />
      ) : (
        <>
          <WhatChanged detail={detail} />
          <Facts detail={detail} today={toKstDate(new Date())} />
        </>
      )}
      <Plan detail={detail} />
      {/* FR-011: 관리자도 남의 사건은 승인·거절하지 못한다 */}
      {detail.isMine && open ? <DecisionPanel incidentId={detail.id} planName={planText(detail).name} /> : null}
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
      {/* spec 010 FR-002: 내 알림에서만. 남의 알림을 보는 관리자에게는 보이지 않는다 */}
      {detail.isMine ? (
        <Suspense fallback={<Loading />}>
          <SimilarIncidents current={{ id: detail.id, incidentType: detail.incidentType, title: detail.facts.title }} userId={userId} />
        </Suspense>
      ) : null}
    </>
  );
}

// IA IC_020100_PG 사건 상세 (FR-009, FR-010, spec 001; FR-006·007, spec 003). MOT: 무엇을 언제까지 해야 하는지 바로 보이게
export default function IncidentDetailPage({ params }: PageProps<"/incidents/[id]">) {
  return (
    <main className={styles.main}>
      <p><Link href="/incidents">← 위험·기회 알림</Link></p>
      <Suspense fallback={<Loading />}>
        <Detail params={params} />
      </Suspense>
    </main>
  );
}
