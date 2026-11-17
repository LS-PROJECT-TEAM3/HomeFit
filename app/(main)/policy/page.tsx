import Link from "next/link";
import { SkeletonNotice, StatusLabel } from "@/app/_components/page-status";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "직장과 정책 | HomeFit AI" };

// 기획안 9절 Work & Policy (spec 004). 공공임대 모집 = 맞춤 공고(NT_080000_PG), 신청 계획 = 내 일정(SC_060000_PG)
export default function PolicyPage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>직장과 정책</h1>
      <div className={styles.grid}>
        <Link href="/notices" className={styles.card}>
          <h2>공공임대주택 모집 정보</h2>
          <p className={styles.muted}>내 조건에 맞춘 마이홈 공고. 팔로우하면 바뀔 때 주거 기회 알림이 옵니다.</p>
          <StatusLabel status="ready" />
        </Link>
        <Link href="/schedule" className={styles.card}>
          <h2>개인별 신청 계획</h2>
          <p className={styles.muted}>승인한 신청 준비 계획과 대응 계획이 일정으로 모입니다.</p>
          <StatusLabel status="ready" />
        </Link>
        <section id="youth" className={styles.card} aria-labelledby="youth-title">
          <h2 id="youth-title">청년 주거지원 정책</h2>
          <StatusLabel status="skeleton" />
          <p className={styles.muted}>온통청년 정책 수집(PRD FR-07)이 들어올 자리입니다. 자격은 판정하지 않고 &ldquo;공고문 기준 확인 필요&rdquo;로만 안내합니다.</p>
        </section>
        <section id="commute" className={styles.card} aria-labelledby="commute-title">
          <h2 id="commute-title">직장 및 생활권 분석</h2>
          <StatusLabel status="out" />
          <p className={styles.muted}>출퇴근 정보는 보류입니다(PRD FR-33, 이후 범위).</p>
        </section>
      </div>
      <div className={styles.section}>
        <SkeletonNotice>청년 정책 목록은 온통청년 API 키와 응답 칸을 확인한 뒤(Intent Q6) 만듭니다.</SkeletonNotice>
      </div>
    </main>
  );
}
