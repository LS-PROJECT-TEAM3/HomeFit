import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoadError, Loading } from "@/app/_components/states";
import { conditionChips, daysLeft, groupCounts, noticeGroup } from "@/incident/notice-list";
import { listMyMatchedNotices, type MatchedResult } from "@/incident/notices.server";
import { listMyPolicies } from "@/incident/policies.server";
import { toKstDate } from "@/watch/kst";
import type { Notice } from "@/watch/notice";
import { ConditionBar } from "./condition-bar";
import { readOverride, regionLabel, sidoName, sigunguNames } from "./listing-data";
import { ListingHead } from "./listing-head";
import { NoticeList, type NoticeRow } from "./notice-list";
import styles from "./notices.module.css";

export const metadata = { title: "맞춤 공고 | HomeFit AI" };

const NOTICE_FIELDS = ["region", "types", "rent", "age"] as const;

function regionOf(notice: Notice, names: Map<string, string>): string {
  // spec 001 v0.6: 전세임대는 전국 수시모집
  if (notice.supplyType === "전세임대" && notice.sigunguCode === null) return "전국";
  const sigungu = notice.sigunguCode ? names.get(notice.sigunguCode) : undefined;
  return [sidoName(notice.sidoCode), sigungu].filter(Boolean).join(" ") || "지역 공고문 확인";
}

async function Listing({ searchParams }: { searchParams: PageProps<"/notices">["searchParams"] }) {
  await connection(); // 오늘 날짜로 마감을 나누므로 요청 때 그린다
  const today = toKstDate(new Date());
  const override = readOverride(await searchParams);
  let result: MatchedResult;
  let policyCount: number | null = null;
  try {
    const [notices, policies] = await Promise.all([listMyMatchedNotices(today, override), listMyPolicies(today, override).catch(() => null)]);
    result = notices;
    policyCount = policies?.hasCondition ? policies.items.length : null;
  } catch {
    return <LoadError>맞춤 공고를 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  if (!result.hasCondition) {
    return (
      <>
        <ListingHead active="notices" counts={{ notices: null, policy: policyCount }}>
        <section className={styles.emptyCard}>
          <h2 className={styles.emptyTitle}>아직 내 조건이 없어요</h2>
          <p className={styles.emptyText}>지역과 공급 유형을 정하면 맞는 공고를 골라 보여 드려요.</p>
          <Link href="/my/conditions" className={styles.emptyLink}>조건 입력하기</Link>
        </section>
        </ListingHead>
      </>
    );
  }
  const names = await sigunguNames(result.condition.sidoCode);
  const region = regionLabel(result.condition.sidoCode, result.condition.sigunguCode, names);
  const rows: NoticeRow[] = result.items.map((item) => ({
    id: item.notice.announcementId, title: item.notice.title, supplyType: item.notice.supplyType ?? "공급 유형 공고문 확인", region: regionOf(item.notice, names),
    group: noticeGroup(item), days: daysLeft(item.notice.applyEnd, today), deadline: item.notice.applyEnd, announcedOn: item.notice.announcedOn, simulated: item.isSimulated,
  }));
  return (
    <>
      <ListingHead active="notices" counts={{ notices: rows.length, policy: policyCount }}>
      <ConditionBar condition={result.condition} chips={conditionChips(result.condition, region)} fields={NOTICE_FIELDS} typeCounts={result.typeCounts} />
      {rows.length === 0 ? (
        <section className={styles.emptyCard}>
          <h2 className={styles.emptyTitle}>조건에 맞는 공고가 아직 없어요</h2>
          <p className={styles.emptyText}>위 칩에서 지역이나 공급 유형을 넓혀 보세요. 새 공고가 올라오면 여기에 보여 드려요.</p>
        </section>
      ) : <NoticeList rows={rows} counts={groupCounts(result.items)} />}
      </ListingHead>
    </>
  );
}

// IA NT_080000_PG 맞춤 공고 (FR-015, FR-017, spec 001 v0.2, spec 022 캔버스 v2-s3-pc). 사건이 아니고 승인할 것도 없다
export default function NoticesPage({ searchParams }: PageProps<"/notices">) {
  return (
    <main className={styles.main}>
      {/* 주소 값(잠깐 바꾼 조건)은 Suspense 안에서 읽는다(cacheComponents) */}
      <Suspense fallback={<Loading />}>
        <Listing searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
