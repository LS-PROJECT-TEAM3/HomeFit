import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { LoadError, Loading } from "@/app/_components/states";
import { describeDeadline } from "@/incident/checklist";
import { policyKinds, type PolicyKind } from "@/incident/policy-match";
import { getOrCreatePolicySummary } from "@/incident/policy-summary.server";
import { getPolicy } from "@/incident/policies.server";
import { policyFollowState } from "@/incident/policy-follows.server";
import { currentUserId } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PolicyHead } from "./policy-follow";
import { toKstDate } from "@/watch/kst";
import type { Policy } from "@/watch/youth-policy";
import styles from "../../notices/[id]/detail.module.css";

export const metadata = { title: "정책 상세 | 청년 주거지원 정책 | HomeFit AI" };

const KIND_LABELS: Record<PolicyKind, string> = { loan: "대출/이자", rent: "월세/전세 지원", housing: "주택/거주", dormitory: "기숙사" };
const LEAD_MAX = 60;

/** 큰 글자 한 줄: 원문 첫 줄을 짧게 */
function lead(text: string | null | undefined, fallback: string): string {
  const first = text?.split("\n").map((s) => s.trim()).find(Boolean);
  if (!first) return fallback;
  return first.length > LEAD_MAX ? `${first.slice(0, LEAD_MAX)}…` : first;
}

function period(policy: Policy, today: string): string {
  if (policy.periodKind === "always") return "상시 신청";
  if (policy.periodKind === "unknown" || !policy.applyEnd) return "신청 기간은 원문 확인";
  const deadline = describeDeadline(policy.applyEnd, today);
  return `${(policy.applyStart ?? "?").replaceAll("-", ".")} ~ ${policy.applyEnd.slice(5).replace("-", ".")} 접수${deadline ? ` (${deadline})` : ""}`;
}

function Kv({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return <div className={styles.kv}><span className={styles.kvKey}>{label}</span><span className={`${styles.kvValue} ${styles.kvPre}`}>{value}</span></div>;
}

function Block({ question, leadText, children }: { question: string; leadText: string; children?: ReactNode }) {
  return (
    <div className={styles.block}>
      <h3 className={styles.blockQuestion}>{question}</h3>
      <div>
        <p className={styles.blockLead}>{leadText}</p>
        <div className={styles.blockRows}>{children}</div>
      </div>
    </div>
  );
}

// FR-007 (spec 006 v0.3): 처음 열 때 AI가 한 번 만들고 저장, 그 뒤로는 저장된 요약
async function AiSummary({ policy }: { policy: Policy }) {
  const result = await getOrCreatePolicySummary(policy).catch(() => null);
  if (!result) return <p className={styles.aiText}>요약을 만들지 못했어요. 아래 정책 원문 값을 확인해 주세요.</p>;
  return <p className={styles.aiText}>{result.summary}{result.isMock ? <span className={styles.mock}> (시험용 mock 요약)</span> : null}</p>;
}

async function Detail({ params }: { params: PageProps<"/policy/[id]">["params"] }) {
  await connection();
  const { id } = await params;
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const policyId = decodeURIComponent(id);
  let policy: Policy | null;
  let follow: { followed: boolean; scheduleId: string | null };
  try {
    [policy, follow] = await Promise.all([getPolicy(policyId), policyFollowState(userId, policyId)]);
  } catch {
    return <LoadError>정책을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  if (!policy) return <LoadError>정책을 찾을 수 없습니다. <Link href="/policy">정책 목록으로</Link></LoadError>;
  const today = toKstDate(new Date());
  const [kind] = policyKinds(policy);
  const ages = policy.minAge === null && policy.maxAge === null ? "나이 조건은 원문 확인" : `만 ${policy.minAge ?? "?"}~${policy.maxAge ?? "?"}세`;
  return (
    <>
      {/* spec 026: 공고 상세와 같은 머리(배지 + 북마크, 팔로우하면 내 일정에 추가) */}
      <PolicyHead policyId={policy.externalId} title={policy.title} kindLabel={kind ? KIND_LABELS[kind] : null} agency={policy.agency ?? "운영 기관 원문 확인"}
        url={policy.url} initialFollowed={follow.followed} initialScheduleId={follow.scheduleId} />
      <section className={styles.card} aria-labelledby="policy-sum-title">
        <div className={styles.cardHead}>
          <h2 id="policy-sum-title" className={styles.cardTitle}>정책 핵심 요약</h2>
          <span className={styles.source}>AI 요약<span className={styles.bar} aria-hidden="true">|</span>출처: 정책 원문</span>
        </div>
        <Suspense fallback={<p className={styles.aiText} role="status">요약을 만드는 중…</p>}>
          <AiSummary policy={policy} />
        </Suspense>
        <Block question="무엇을 지원하나요" leadText={lead(policy.support, "지원 내용은 원문 확인")}>
          <Kv label="지원 내용" value={policy.support} />
          <Kv label="정책 설명" value={policy.description} />
        </Block>
        {/* 자격은 판정하지 않는다(PRD 9절) */}
        <Block question="누가 신청할 수 있나요" leadText={ages}>
          <Kv label="추가 자격" value={policy.extraQualification} />
          <Kv label="참여 제한" value={policy.excluded} />
          <Kv label="확인" value="HomeFit은 신청 자격을 판정하지 않아요. 원문에서 확인해 주세요." />
        </Block>
        <Block question="언제 신청하나요" leadText={period(policy, today)}>
          <Kv label="사업 기간" value={policy.periodNote} />
        </Block>
        <Block question="어떻게 신청하나요" leadText="이 서비스에서는 신청하지 않아요">
          <Kv label="신청 방법" value={policy.applyMethod} />
          <Kv label="심사 방법" value={policy.screening} />
          <Kv label="제출 서류" value={policy.documents} />
        </Block>
      </section>
    </>
  );
}

// IA PL_090100_PG 정책 상세 (spec 006 v0.3 FR-007, 사용자 요청 2026-11-18, spec 022 캔버스 v2-s3c-pc)
export default function PolicyDetailPage({ params }: PageProps<"/policy/[id]">) {
  return (
    <main className={styles.main}>
      <nav aria-label="현재 위치" className={styles.crumb}>
        <Link href="/">홈</Link><span aria-hidden="true">›</span><Link href="/policy">청년 주거지원 정책</Link><span aria-hidden="true">›</span><span aria-current="page">정책 상세</span>
      </nav>
      <Suspense fallback={<Loading />}>
        <Detail params={params} />
      </Suspense>
    </main>
  );
}
