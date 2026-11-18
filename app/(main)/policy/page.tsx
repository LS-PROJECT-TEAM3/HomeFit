import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Empty, LoadError, Loading } from "@/app/_components/states";
import { describeDeadline } from "@/incident/checklist";
import { listMyPolicies, type PolicyListResult } from "@/incident/policies.server";
import { toKstDate } from "@/watch/kst";
import type { Policy } from "@/watch/youth-policy";
import hub from "@/app/_components/hub.module.css";
import styles from "./policy.module.css";

export const metadata = { title: "청년 주거지원 정책 | 직장과 정책 | HomeFit AI" };

// 정책 설명이 길어 첫 줄만 보인다. 전체는 원문에서
const SUMMARY_PREVIEW = 120;
// 지역 목록이 비었거나 시군구 거의 전부(2026-11-18 응답에서 247~256곳)면 전국 대상으로 본다
const NATIONWIDE_REGIONS = 200;

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
  return policy.regionCodes.length === 0 || policy.regionCodes.length >= NATIONWIDE_REGIONS;
}

function preview(text: string | null): string | null {
  if (!text) return null;
  const first = text.split("\n")[0].trim();
  return first.length > SUMMARY_PREVIEW ? `${first.slice(0, SUMMARY_PREVIEW)}…` : first;
}

async function PolicyList() {
  await connection(); // 오늘 날짜로 끝난 정책을 빼므로 요청 때 그린다
  const today = toKstDate(new Date());
  let result: PolicyListResult;
  try {
    result = await listMyPolicies(today);
  } catch {
    return <LoadError>청년 주거 정책을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  if (!result.hasCondition) {
    return <Empty>조건(지역·나이)을 입력하면 맞는 정책이 여기에 보입니다. <Link href="/my/conditions">조건 입력하기</Link></Empty>;
  }
  if (result.items.length === 0) {
    return <Empty>내 지역·나이에 맞는 청년 주거 정책이 아직 없습니다. <Link href="/my/conditions">조건 수정하기</Link></Empty>;
  }
  return (
    <>
      <p className={styles.count}>내 조건에 맞는 정책 <strong>{result.items.length}건</strong></p>
      <ul className={styles.list}>
        {result.items.map(({ policy }) => (
          <li key={policy.externalId} className={`${hub.card} ${styles.item}`}>
            <h3>{policy.title}</h3>
            <p className={styles.meta}>{[policy.agency, policy.supplyType, nationwide(policy) ? "전국 대상" : null].filter(Boolean).join(" · ")}</p>
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
export default function PolicyYouthPage() {
  return (
    <section aria-labelledby="youth-title">
      <h2 id="youth-title">청년 주거지원 정책</h2>
      <p className={hub.muted}>온통청년의 주거 분야 정책 중 내 지역·나이에 맞고 신청이 끝나지 않은 것입니다. 하루 1번 새로 받아 옵니다. 마감이 가까운 순서입니다.</p>
      <Suspense fallback={<Loading />}>
        <PolicyList />
      </Suspense>
    </section>
  );
}
