import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoadError, Loading } from "@/app/_components/states";
import { conditionChips, daysLeft } from "@/incident/notice-list";
import { listMyMatchedNotices } from "@/incident/notices.server";
import { policyKinds } from "@/incident/policy-match";
import { listMyPolicies, type PolicyListResult } from "@/incident/policies.server";
import { toKstDate } from "@/watch/kst";
import type { Policy } from "@/watch/youth-policy";
import { ConditionBar } from "../notices/condition-bar";
import { readOverride, regionLabel, sigunguNames } from "../notices/listing-data";
import { ListingHead } from "../notices/listing-head";
import styles from "../notices/notices.module.css";
import { PolicyList, type PolicyRow } from "./policy-list";

export const metadata = { title: "청년 주거지원 정책 | 맞춤 공고 | HomeFit AI" };

const POLICY_FIELDS = ["region", "age", "targets"] as const;

function ages(policy: Policy): string {
  if (policy.minAge === null && policy.maxAge === null) return "나이 공고문 확인";
  return `만 ${policy.minAge ?? "?"}~${policy.maxAge ?? "?"}세`;
}

async function Listing({ searchParams }: { searchParams: PageProps<"/policy">["searchParams"] }) {
  await connection(); // 오늘 날짜로 끝난 정책을 빼므로 요청 때 그린다
  const today = toKstDate(new Date());
  const override = readOverride(await searchParams);
  let result: PolicyListResult;
  let noticeCount: number | null = null;
  try {
    const [policies, notices] = await Promise.all([listMyPolicies(today, override), listMyMatchedNotices(today, override).catch(() => null)]);
    result = policies;
    noticeCount = notices?.hasCondition ? notices.items.length : null;
  } catch {
    return <LoadError>청년 주거 정책을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  if (!result.hasCondition) {
    return (
      <>
        <ListingHead active="policy" counts={{ notices: noticeCount, policy: null }}>
        <section className={styles.emptyCard}>
          <h2 className={styles.emptyTitle}>아직 내 조건이 없어요</h2>
          <p className={styles.emptyText}>지역과 나이를 정하면 맞는 청년 주거 정책을 골라 보여 드려요.</p>
          <Link href="/my/conditions" className={styles.emptyLink}>조건 입력하기</Link>
        </section>
        </ListingHead>
      </>
    );
  }
  const names = await sigunguNames(result.condition.sidoCode);
  const rows: PolicyRow[] = result.items.map(({ policy }) => ({
    id: policy.externalId, title: policy.title, kinds: policyKinds(policy), agency: policy.agency ?? "운영 기관 공고문 확인", ages: ages(policy),
    periodKind: policy.periodKind, days: daysLeft(policy.applyEnd, today), deadline: policy.applyEnd,
  }));
  return (
    <>
      <ListingHead active="policy" counts={{ notices: noticeCount, policy: rows.length }}>
      <ConditionBar condition={result.condition} chips={conditionChips(result.condition, regionLabel(result.condition.sidoCode, result.condition.sigunguCode, names))} fields={POLICY_FIELDS} targetCounts={result.targetCounts} />
      {rows.length === 0 ? (
        <section className={styles.emptyCard}>
          <h2 className={styles.emptyTitle}>조건에 맞는 정책이 아직 없어요</h2>
          <p className={styles.emptyText}>위 칩에서 지역이나 대상을 넓혀 보세요. 정책은 하루 한 번 새로 받아 와요.</p>
        </section>
      ) : <PolicyList rows={rows} />}
      </ListingHead>
    </>
  );
}

// 기획안 Work & Policy "청년 주거지원 정책" (PRD FR-07, spec 006 FR-003, spec 022 캔버스 v2-s3b-pc). 자격은 판정하지 않는다(PRD 9절)
export default function PolicyYouthPage({ searchParams }: PageProps<"/policy">) {
  return (
    <main className={styles.main}>
      <Suspense fallback={<Loading />}>
        <Listing searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
