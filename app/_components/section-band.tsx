"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, type ReactNode } from "react";
import { isActivePath } from "./navigation";
import { useSnapTo } from "./use-snap-to";
import styles from "./section-band.module.css";

// spec 022 FR-011: 탭이 있는 포스터형 화면의 머리(캔버스 v2-qc-sim-tab-pc). PC는 진초록 띠 + 폴더 탭,
// 휴대폰은 보드(v2-qc-sim-phone)대로 가운데 제목 + 세로선 + 2칸 밑줄 탭. 탭은 링크라 nav + aria-current

export type BandTab = { href: string; label: string };

/** 첫 탭(구역 주소)은 그 주소에서만, 나머지는 하위 주소까지 지금 탭 */
function isCurrent(pathname: string, tab: BandTab, first: boolean): boolean {
  return first ? pathname === tab.href : isActivePath(pathname, tab.href);
}

/** figure: 띠 안 큰 숫자 칸(에너지 분석 등, PC만). 휴대폰은 화면이 카드로 따로 보인다 */
export function SectionBand({ title, subtitle, tabs, label, figure }: { title: string; subtitle?: string; tabs: BandTab[]; label: string; figure?: ReactNode }) {
  const pathname = usePathname();
  // 사용자 요청(2026-11-21): 스크롤하면 제목이 올라가고 탭이 화면 맨 위에 딱 맞게(PC는 폴더 탭, 휴대폰은 밑줄 탭).
  // 탭은 위쪽 메뉴 아래에 붙어 메뉴와 같이 숨고 나타난다. 붙은 탭은 위치가 바뀌므로 기준은 탭 바로 뒤(내용 시작)의 빈 표시(sentinel)로 잰다
  const folderRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  useSnapTo(folderRef, { minWidth: 960 });
  useSnapTo(phoneRef, { maxWidth: 959 });
  const links = (className: string, activeClass: string) =>
    tabs.map((tab, i) => {
      const current = isCurrent(pathname, tab, i === 0);
      return (
        <Link key={tab.href} href={tab.href} className={`${className} ${current ? activeClass : ""}`} aria-current={current ? "page" : undefined}>{tab.label}</Link>
      );
    });
  return (
    <>
      <section className={`${styles.band} ${figure ? styles.bandFigure : ""}`} aria-labelledby="band-title">
        <h1 id="band-title" className={styles.title}>{title}</h1>
        {subtitle ? <p className={styles.sub}>{subtitle}</p> : null}
        {figure}
      </section>
      <div className={styles.folderBar} data-sticky-bar>
        <nav className={styles.folder} aria-label={label}>{links(styles.folderTab, styles.folderOn)}</nav>
      </div>
      {/* 내용 시작 표시: 직접 스크롤하면 여기를 맨 위로(메뉴·탭은 숨음) */}
      <div ref={folderRef} className={styles.sentinelPc} aria-hidden="true" />
      <div className={styles.phoneHead}>
        <h1 className={styles.phoneTitle}>{title}</h1>
        <span aria-hidden="true" className={styles.phoneLine} />
      </div>
      <div className={styles.phoneTabsBar} data-sticky-bar>
        <nav className={styles.phoneTabs} aria-label={label}>{links(styles.phoneTab, styles.phoneOn)}</nav>
      </div>
      <div ref={phoneRef} className={styles.sentinelPhone} aria-hidden="true" />
    </>
  );
}
