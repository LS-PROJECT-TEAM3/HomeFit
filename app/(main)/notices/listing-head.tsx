import Link from "next/link";
import styles from "./notices.module.css";

// spec 022(캔버스 v2-s3-pc·s3b-pc, 현경 결정 2026-11-22): 맞춤 공고 머리. 가운데 제목 + 세로선 + 큰 탭 2개(공공임대 모집 / 청년 주거지원 정책)와 건수.
// 옛 "신청 계획(내 일정)" 탭은 뺐다(위쪽 메뉴에 내 일정이 있음)
type Props = { active: "notices" | "policy"; counts: { notices: number | null; policy: number | null } };

export function ListingHead({ active, counts }: Props) {
  const tabs = [
    { key: "notices", href: "/notices", label: "공공임대 모집", count: counts.notices },
    { key: "policy", href: "/policy", label: "청년 주거지원 정책", count: counts.policy },
  ] as const;
  return (
    <>
      <h1 className={styles.title}>맞춤 공고</h1>
      <span className={styles.titleLine} aria-hidden="true" />
      <nav className={styles.segments} aria-label="목록 구분">
        {tabs.map((tab) => (
          <Link key={tab.key} href={tab.href} className={`${styles.segment} ${tab.key === active ? styles.segmentOn : ""}`} aria-current={tab.key === active ? "page" : undefined}>
            {tab.label}{tab.count === null ? null : <span className={styles.segmentCount}>{tab.count}</span>}
          </Link>
        ))}
      </nav>
    </>
  );
}
