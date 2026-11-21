"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActivePath } from "./navigation";
import styles from "./side-tabs.module.css";

// spec 022 FR-014(캔버스 v2-set-*·v2-admin-*, DS SideTabs): 설정·관리자 화면 안 메뉴. PC는 왼쪽 세로 탭(폭 200px),
// 휴대폰은 위쪽 밑줄 탭(설정 2칸, 관리자 3칸). 탭은 링크라 nav + aria-current

export type SideTab = { href: string; label: string };

/** 첫 탭이 구역 주소 자체(/admin)면 그 주소에서만, 나머지는 하위 주소까지 지금 탭 */
function isCurrent(pathname: string, tab: SideTab, exact: boolean): boolean {
  return exact ? pathname === tab.href : isActivePath(pathname, tab.href);
}

export function SideTabs({ tabs, label, columns, exactFirst = false }: { tabs: readonly SideTab[]; label: string; columns: 2 | 3; exactFirst?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className={`${styles.nav} ${columns === 3 ? styles.three : ""}`} aria-label={label}>
      {tabs.map((tab, i) => {
        const current = isCurrent(pathname, tab, exactFirst && i === 0);
        return (
          <Link key={tab.href} href={tab.href as Route} className={`${styles.tab} ${current ? styles.on : ""}`} aria-current={current ? "page" : undefined}>{tab.label}</Link>
        );
      })}
    </nav>
  );
}
