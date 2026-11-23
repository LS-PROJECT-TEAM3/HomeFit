import Link from "next/link";
import type { ReactNode } from "react";
import { SnapTarget } from "@/app/_components/snap-target";
import styles from "./notices.module.css";

// spec 022(캔버스 v2-s3-pc·s3b-pc, 현경 결정 2026-11-22): 맞춤 공고 머리. 가운데 제목 + 세로선 + 큰 탭 2개(공공임대 모집 / 청년 주거지원 정책)와 건수.
// 옛 "신청 계획(내 일정)" 탭은 뺐다(위쪽 메뉴에 내 일정이 있음)
// 사용자 요청(2026-11-23): 맨 위에서 아래로 스크롤하면 큰 탭으로 맞추고(SnapTarget), 아래 내용(조건·목록)을 누를 때도
// 조건 칸이 아니라 큰 탭 줄로 맞춘다. 사용자 요청(2026-11-23): 다른 탭 화면의 스크롤 맞춤처럼 이때도 메뉴를 숨기고 탭 줄을 맨 위에(data-snap-hide-nav)(data-snap-section, focus-scroll.tsx). 그래서 내용은 children으로 받아 같은 영역에 둔다
type Props = { active: "notices" | "policy"; counts: { notices: number | null; policy: number | null }; children: ReactNode };

export function ListingHead({ active, counts, children }: Props) {
  const tabs = [
    { key: "notices", href: "/notices", label: "공공임대 모집", count: counts.notices },
    { key: "policy", href: "/policy", label: "청년 주거지원 정책", count: counts.policy },
  ] as const;
  return (
    <>
      <h1 className={styles.title}>맞춤 공고</h1>
      <span className={styles.titleLine} aria-hidden="true" />
      <SnapTarget className={styles.snapOuter}>
      <div data-snap-section data-snap-hide-nav className={styles.snapArea}>
      <nav className={styles.segments} aria-label="목록 구분">
        {tabs.map((tab) => (
          <Link key={tab.key} href={tab.href} className={`${styles.segment} ${tab.key === active ? styles.segmentOn : ""}`} aria-current={tab.key === active ? "page" : undefined}>
            {tab.label}{tab.count === null ? null : <span className={styles.segmentCount}>{tab.count}</span>}
          </Link>
        ))}
      </nav>
      {children}
      </div>
      </SnapTarget>
    </>
  );
}
