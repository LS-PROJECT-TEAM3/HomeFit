import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Empty, LoadError, Loading } from "@/app/_components/states";
import { describeDeadline } from "@/incident/checklist";
import { NATIONWIDE, POLICY_KIND_LABELS, POLICY_KINDS, policyKinds, type PolicyKind } from "@/incident/policy-match";
import { listMyPolicies, type PolicyListResult } from "@/incident/policies.server";
import { toKstDate } from "@/watch/kst";
import type { Policy } from "@/watch/youth-policy";
import hub from "@/app/_components/hub.module.css";
import styles from "./policy.module.css";

export const metadata = { title: "청년 주거지원 정책 | 직장과 정책 | HomeFit AI" };

// 정책 설명이 길어 첫 줄만 보인다. 전체는 원문에서
const SUMMARY_PREVIEW = 120;

function period(policy: Policy, today: string): string {
  if (policy.periodKind === "always") return "상시 신청";
  if (policy.periodKind === "unknown") return "신청 기간: 공고문 확인";
  return `신청 ${policy.applyStart ?? "?"} ~ ${policy.applyEnd} (${describeDeadline(policy.applyEnd, today)})`;
}

function ages(policy: Policy): string {
  if (policy.minAge === null && policy.maxAge === null) return "나이 조건: 공고문 확인";
  return `만 ${policy.minAge ?? "?"}~${policy.maxAge ?? "?"}세`;
}

function nationwide(policy: Policy): boolean {
  return policy.regionCodes.length === 0 || policy.regionCodes.length >= NATIONWIDE;
}

function preview(text: string | null): string | null {
  if (!text) return null;
  const first = text.split("\n")[0].trim();
  return first.length > SUMMARY_PREVIEW ? `${first.slice(0, SUMMARY_PREVIEW)}…` : first;
}

function isKind(value: string | string[] | undefined): value is PolicyKind {
  return typeof value === "string" && (POLICY_KINDS as readonly string[]).includes(value);
}

// 사용자 요청(2026-11-18): 종류로 거르기(주거·대출 등). 주소(?kind=)에 남겨 새로고침·공유해도 그대로
function KindFilter({ kind }: { kind: PolicyKind | undefined }) {
  const options: [PolicyKind | undefined, string][] = [[undefined, "전체"], ...POLICY_KINDS.map((k): [PolicyKind, string] => [k, POLICY_KIND_LABELS[k]])];
  return (
    <nav className={styles.filters} aria-label="정책 종류">
      {options.map(([value, label]) => (
        <Link key={label} href={value ? `/policy?kind=${value}` : "/policy"} className={styles.filter} aria-current={value === kind ? "page" : undefined}>{label}</Link>
      ))}
    </nav>
  );
}

async function PolicyList({ searchParams }: { searchParams: PageProps<"/policy">["searchParams"] }) {
  await connection(); // 오늘 날짜로 끝난 정책을 빼므로 요청 때 그린다
  const raw = (await searchParams).kind;
  const kind = isKind(raw) ? raw : undefined;
  const today = toKstDate(new Date());
  let result: PolicyListResult;
  try {
    result = await listMyPolicies(today, kind);
  } catch {
    return <LoadError>청년 주거 정책을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  if (!result.hasCondition) {
    return <Empty>조건(지역·나이)을 입력하면 맞는 정책이 여기에 보입니다. <Link href="/my/conditions">조건 입력하기</Link></Empty>;
  }
  if (result.items.length === 0) {
    return (
      <>
        <KindFilter kind={kind} />
        <Empty>{kind ? `${POLICY_KIND_LABELS[kind]} 종류에서 ` : ""}내 지역·나이에 맞는 청년 주거 정책이 아직 없습니다. <Link href="/my/conditions">조건 수정하기</Link></Empty>
      </>
    );
  }
  return (
    <>
      <KindFilter kind={kind} />
      <p className={styles.count}>내 조건에 맞는 정책 <strong>{result.items.length}건</strong></p>
      <ul className={styles.list}>
        {result.items.map(({ policy, sameName }) => (
          <li key={policy.externalId} className={`${hub.card} ${styles.item}`}>
            <h3>{policy.title}</h3>
            <p className={styles.meta}>{[policy.agency, ...policyKinds(policy).map((k) => POLICY_KIND_LABELS[k]), nationwide(policy) ? "전국 대상" : null].filter(Boolean).join(" · ")}</p>
            {sameName > 1 ? <p className={styles.meta}>같은 이름 정책 {sameName}건 중 내 지역에 가장 맞는 것 하나만 보입니다(지역마다 따로 올라옴)</p> : null}
            <p className={styles.meta}>{period(policy, today)} · {ages(policy)}</p>
            {preview(policy.description ?? policy.support) ? <p className={styles.support}>{preview(policy.description ?? policy.support)}</p> : null}
            <p className={styles.meta}>자격은 공고문 기준 확인 필요</p>
            {policy.url ? (
              <a href={policy.url} target="_blank" rel="noopener noreferrer" aria-label={`${policy.title} 원문 보기 (새 창)`}>원문 보기 ↗</a>
            ) : (
              <p className={styles.meta}>원문 링크 없음: 운영 기관에 문의</p>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

// 기획안 Work & Policy "청년 주거지원 정책" (PRD FR-07, spec 006 FR-003). 자격은 판정하지 않는다(PRD 9절)
export default function PolicyYouthPage({ searchParams }: PageProps<"/policy">) {
  return (
    <section aria-labelledby="youth-title">
      <h2 id="youth-title">청년 주거지원 정책</h2>
      <p className={hub.muted}>온통청년의 주거 분야 정책 중 내 지역·나이에 맞고 신청이 끝나지 않은 것입니다. 하루 1번 새로 받아 옵니다. 마감이 가까운 순서입니다.</p>
      <Suspense fallback={<Loading />}>
        <PolicyList searchParams={searchParams} />
      </Suspense>
    </section>
  );
}
