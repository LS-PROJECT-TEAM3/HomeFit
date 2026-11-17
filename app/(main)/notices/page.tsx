import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Empty, LoadError, Loading } from "@/app/_components/states";
import { NoticeBadge, SimulatedBadge } from "@/app/_components/status";
import { describeDeadline } from "@/incident/checklist";
import { listMyMatchedNotices, type MatchedResult } from "@/incident/notices.server";
import { toKstDate } from "@/watch/kst";
import styles from "../incidents/incidents.module.css";

export const metadata = { title: "맞춤 공고 | HomeFit AI" };

async function MatchedList() {
  await connection(); // 오늘 날짜로 마감을 나누므로 요청 때 그린다
  const today = toKstDate(new Date());
  let result: MatchedResult;
  try {
    result = await listMyMatchedNotices(today);
  } catch {
    return <LoadError>맞춤 공고를 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  if (!result.hasCondition) {
    return <Empty>조건을 입력하면 맞춤 공고가 여기에 보입니다. <Link href="/my/conditions">조건 입력하기</Link></Empty>;
  }
  if (result.items.length === 0) {
    return <Empty>조건에 맞는 공고가 아직 없습니다. <Link href="/my/conditions">조건 수정하기</Link></Empty>;
  }
  return (
    <ul className={styles.list}>
      {result.items.map(({ notice, expired, isSimulated, decision }) => (
        <li key={notice.announcementId}>
          {/* H-006: 박스 전체를 눌러 공고 상세로. 상태는 사건 목록처럼 배지 */}
          <Link href={`/notices/${encodeURIComponent(notice.announcementId)}`} className={styles.item}>
            <span className={styles.badges}>
              <NoticeBadge status={decision} />
              {expired ? <NoticeBadge status="closed" /> : null}
              {isSimulated ? <SimulatedBadge /> : null}
            </span>
            <span className={styles.itemTitle}>{notice.title}</span>
            <span className={styles.meta}>
              {notice.supplyType ?? "공급 유형 공고문 확인"} · {expired ? `마감 ${notice.applyEnd}` : (describeDeadline(notice.applyEnd, today) ?? "마감일: 공고문 확인")}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// IA NT_080000_PG 맞는 공고 (FR-015, FR-017, spec 001 v0.2). 사건이 아니고 승인할 것도 없다
export default function NoticesPage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>맞춤 공고</h1>
      <p className={styles.meta}>내 조건에 맞는 공고입니다. 눌러서 요약을 보고 팔로우할지 정하세요. 팔로우한 공고의 접수 기간·임대료가 바뀌거나 정정공고가 올라오면 주거 기회 알림으로 알려 드립니다.</p>
      <Suspense fallback={<Loading />}>
        <MatchedList />
      </Suspense>
    </main>
  );
}
