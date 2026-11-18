import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoadError, Loading } from "@/app/_components/states";
import { describeDeadline } from "@/incident/checklist";
import { POLICY_KIND_LABELS, policyKinds } from "@/incident/policy-match";
import { getOrCreatePolicySummary } from "@/incident/policy-summary.server";
import { getPolicy } from "@/incident/policies.server";
import { toKstDate } from "@/watch/kst";
import type { Policy } from "@/watch/youth-policy";
import hub from "@/app/_components/hub.module.css";
import styles from "../policy.module.css";

export const metadata = { title: "정책 상세 | 청년 주거지원 정책 | HomeFit AI" };

// FR-007 (spec 006 v0.3): 처음 열 때 AI가 한 번 만들고 저장, 그 뒤로는 저장된 요약
async function Summary({ policy }: { policy: Policy }) {
  const result = await getOrCreatePolicySummary(policy).catch(() => null);
  return (
    <section className={hub.card} aria-labelledby="summary-title">
      <h2 id="summary-title">한눈에 보기</h2>
      {result ? (
        <>
          <p>{result.summary}</p>
          <p className={styles.meta}>{result.isMock ? "시험용 요약(mock, 실제 AI가 쓴 글이 아님)" : "AI 요약"} · 근거: 아래 정책 원문 값 · 자격은 원문에서 확인 필요</p>
        </>
      ) : (
        <p className={styles.meta}>요약을 만들지 못했습니다. 아래 원문 값을 확인해 주세요.</p>
      )}
    </section>
  );
}

function period(policy: Policy, today: string): string {
  if (policy.periodKind === "always") return "상시 신청";
  if (policy.periodKind === "unknown" || !policy.applyEnd) return "원문 확인";
  return `${policy.applyStart ?? "?"} ~ ${policy.applyEnd} (${describeDeadline(policy.applyEnd, today)})`;
}

// 원문 칸. 비어 있는 칸은 보이지 않는다(정책마다 채운 칸이 다르다)
function rows(policy: Policy, today: string): [string, string | null | undefined][] {
  const ages = policy.minAge === null && policy.maxAge === null ? "원문 확인" : `만 ${policy.minAge ?? "?"}~${policy.maxAge ?? "?"}세`;
  return [
    ["정책 설명", policy.description], ["지원 내용", policy.support], ["신청 기간", period(policy, today)],
    ["사업 기간", policy.periodNote], ["나이", ages], ["신청 방법", policy.applyMethod], ["심사 방법", policy.screening],
    ["제출 서류", policy.documents], ["추가 자격 조건", policy.extraQualification], ["참여 제한 대상", policy.excluded],
    ["운영 기관", policy.agency],
  ];
}

async function Detail({ params }: { params: PageProps<"/policy/[id]">["params"] }) {
  await connection();
  const { id } = await params;
  let policy: Policy | null;
  try {
    policy = await getPolicy(decodeURIComponent(id));
  } catch {
    return <LoadError>정책을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  if (!policy) return <LoadError>정책을 찾을 수 없습니다. <Link href="/policy">정책 목록으로</Link></LoadError>;
  const today = toKstDate(new Date());
  const kinds = policyKinds(policy).map((k) => POLICY_KIND_LABELS[k]);
  return (
    <>
      <h2>{policy.title}</h2>
      {kinds.length ? <p className={styles.meta}>{kinds.join(" · ")}</p> : null}
      <Suspense fallback={<section className={hub.card}><p role="status">요약을 만드는 중…</p></section>}>
        <Summary policy={policy} />
      </Suspense>
      <section className={hub.card} aria-labelledby="facts-title">
        <h2 id="facts-title">정책 원문 값</h2>
        <dl className={styles.facts}>
          {rows(policy, today).filter(([, value]) => value).map(([label, value]) => (
            <div key={label} className={styles.factRow}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <p className={styles.meta}>자격은 공고문 기준 확인 필요. HomeFit은 자격을 판정하지 않습니다.</p>
        {policy.url ? <a href={policy.url} target="_blank" rel="noopener noreferrer">원문 보기 ↗ (새 창)</a> : <p className={styles.meta}>원문 링크 없음: 운영 기관에 문의</p>}
      </section>
    </>
  );
}

// IA PL_090100_PG 정책 상세 (spec 006 v0.3 FR-007, 사용자 요청 2026-11-18)
export default function PolicyDetailPage({ params }: PageProps<"/policy/[id]">) {
  return (
    <section aria-label="정책 상세">
      <p><Link href="/policy">← 청년 주거지원 정책</Link></p>
      <Suspense fallback={<Loading />}>
        <Detail params={params} />
      </Suspense>
    </section>
  );
}
