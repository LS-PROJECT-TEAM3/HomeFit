import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoadError, Loading } from "@/app/_components/states";
import { conditionChips, daysLeft, groupCounts, noticeGroup, type ConditionOverride } from "@/incident/notice-list";
import { listMyMatchedNotices, type MatchedResult } from "@/incident/notices.server";
import { listMyPolicies } from "@/incident/policies.server";
import { toKstDate } from "@/watch/kst";
import type { Notice } from "@/watch/notice";
import { fetchSigunguList } from "@/watch/region.server";
import { SIDO_OPTIONS } from "@/watch/sido";
import { ConditionBar } from "./condition-bar";
import { ListingHead } from "./listing-head";
import { NoticeList, type NoticeRow } from "./notice-list";
import styles from "./notices.module.css";

export const metadata = { title: "맞춤 공고 | HomeFit AI" };

const OVERRIDE_KEYS = ["sido", "sgg", "types", "rent", "age"] as const;

function readOverride(params: Record<string, string | string[] | undefined>): ConditionOverride {
  const override: ConditionOverride = {};
  for (const key of OVERRIDE_KEYS) {
    const value = params[key];
    if (typeof value === "string") override[key] = value;
  }
  return override;
}

const sidoName = (code: string | null) => SIDO_OPTIONS.find((o) => o.code === code)?.name ?? "";

/** 시군구 이름은 30일 기억하는 목록에서. 못 읽으면 시도 이름만 보인다 */
async function sigunguNames(sidoCode: string): Promise<Map<string, string>> {
  try {
    return new Map((await fetchSigunguList(sidoCode)).map((s) => [s.code, s.name]));
  } catch {
    return new Map();
  }
}

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
    const [notices, policies] = await Promise.all([listMyMatchedNotices(today, override), listMyPolicies(today).catch(() => null)]);
    result = notices;
    policyCount = policies?.hasCondition ? policies.items.length : null;
  } catch {
    return <LoadError>맞춤 공고를 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  if (!result.hasCondition) {
    return (
      <>
        <ListingHead active="notices" counts={{ notices: null, policy: policyCount }} />
        <section className={styles.emptyCard}>
          <h2 className={styles.emptyTitle}>아직 내 조건이 없어요</h2>
          <p className={styles.emptyText}>지역과 공급 유형을 정하면 맞는 공고를 골라 보여 드려요.</p>
          <Link href="/my/conditions" className={styles.emptyLink}>조건 입력하기</Link>
        </section>
      </>
    );
  }
  const names = await sigunguNames(result.condition.sidoCode);
  const region = [sidoName(result.condition.sidoCode), result.condition.sigunguCode ? names.get(result.condition.sigunguCode) : null].filter(Boolean).join(" ");
  const rows: NoticeRow[] = result.items.map((item) => ({
    id: item.notice.announcementId, title: item.notice.title, supplyType: item.notice.supplyType ?? "공급 유형 공고문 확인", region: regionOf(item.notice, names),
    group: noticeGroup(item), days: daysLeft(item.notice.applyEnd, today), deadline: item.notice.applyEnd, announcedOn: item.notice.announcedOn, simulated: item.isSimulated,
  }));
  return (
    <>
      <ListingHead active="notices" counts={{ notices: rows.length, policy: policyCount }} />
      <ConditionBar condition={result.condition} chips={conditionChips(result.condition, region || sidoName(result.condition.sidoCode))} typeCounts={result.typeCounts} />
      {rows.length === 0 ? (
        <section className={styles.emptyCard}>
          <h2 className={styles.emptyTitle}>조건에 맞는 공고가 아직 없어요</h2>
          <p className={styles.emptyText}>위 칩에서 지역이나 공급 유형을 넓혀 보세요. 새 공고가 올라오면 여기에 보여 드려요.</p>
        </section>
      ) : <NoticeList rows={rows} counts={groupCounts(result.items)} />}
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
