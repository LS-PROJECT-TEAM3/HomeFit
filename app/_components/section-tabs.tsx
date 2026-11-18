"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./hub.module.css";

// spec 004 v0.2 FR-001: 화면 안 하위 항목을 위쪽 탭으로. 뼈대·범위 밖 탭은 글자로 표시
export type Tab = { href: string; label: string; note?: "뼈대" | "범위 밖" };

/** activeHref를 주면 그 탭(주소 뒤 ?status= 같은 필터 탭), 아니면 지금 주소와 같은 탭 */
export function SectionTabs({ tabs, label, activeHref }: { tabs: readonly Tab[]; label: string; activeHref?: string }) {
  const pathname = usePathname();
  const current = activeHref ?? pathname;
  return (
    <nav aria-label={label} className={styles.tabsNav}>
      <ul className={styles.tabs}>
        {tabs.map((tab) => (
          <li key={tab.href}>
            {/* 탭 주소는 각 화면이 정한 고정 목록이다(필터 주소 포함) */}
            <Link href={tab.href as Route} className={styles.tab} aria-current={current === tab.href ? "page" : undefined}>
              {tab.label}
              {tab.note ? <span className={styles.tabNote}>({tab.note})</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
