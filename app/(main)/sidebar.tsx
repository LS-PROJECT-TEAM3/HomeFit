"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon, type IconName } from "@/app/_components/icons";
import { isActivePath } from "@/app/_components/navigation";
import styles from "./main.module.css";

type Item = { href: "/" | "/compare" | "/qc" | "/energy" | "/policy" | "/incidents" | "/knowledge" | "/schedule" | "/my/home" | "/admin"; label: string; icon: IconName };

// spec 004 v0.2 FR-001: 기획안 9절 화면 7개 + 내 일정·내 정보. 화면 이름은 IA v1.4 용어
// 관리자 메뉴는 관리자에게만 보인다(사용자 결정 2026-11-18: "관리자 탭 저런 식이라면 추가해도 됨")
const MAIN: Item[] = [
  { href: "/", label: "홈", icon: "home" },
  { href: "/compare", label: "집 비교", icon: "compare" },
  { href: "/qc", label: "집 점검", icon: "check" },
  { href: "/energy", label: "에너지 분석", icon: "energy" },
  { href: "/policy", label: "직장과 정책", icon: "policy" },
  { href: "/incidents", label: "위험·기회 알림", icon: "bell" },
  { href: "/knowledge", label: "AI 도우미", icon: "ai" },
];
const MINE: Item[] = [
  { href: "/schedule", label: "내 일정", icon: "calendar" },
  { href: "/my/home", label: "내 정보", icon: "user" },
];
const ADMIN: Item = { href: "/admin", label: "관리자", icon: "shield" };

function NavLink({ item, active, badge, onPick }: { item: Item; active: boolean; badge?: number; onPick: () => void }) {
  return (
    <li>
      <Link href={item.href} className={styles.navLink} aria-current={active ? "page" : undefined} onClick={onPick}>
        <Icon name={item.icon} />
        <span>{item.label}</span>
        {/* 새 알림 수: 색만이 아니라 숫자로 (IA 네비게이션 모델) */}
        {badge ? <span className={styles.navBadge} aria-label={`새 알림 ${badge}건`}>{badge}</span> : null}
      </Link>
    </li>
  );
}

/** PC는 왼쪽 고정, 휴대폰은 위쪽 "메뉴" 버튼으로 연다 */
export function Sidebar({ newAlerts, isAdmin }: { newAlerts: number; isAdmin: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const mine = isAdmin ? [...MINE, ADMIN] : MINE;
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarTop}>
        <Link href="/" className={styles.brand} onClick={close}>HomeFit AI</Link>
        <button type="button" className={styles.menuButton} aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen((v) => !v)}>
          <Icon name="menu" /> 메뉴
        </button>
      </div>
      <nav id="main-nav" aria-label="주 메뉴" className={`${styles.nav} ${open ? styles.navOpen : ""}`}>
        <ul className={styles.navList}>
          {MAIN.map((item) => (
            <NavLink key={item.href} item={item} active={isActivePath(pathname, item.href) || (item.href === "/policy" && isActivePath(pathname, "/notices"))}
              badge={item.href === "/incidents" ? newAlerts : undefined} onPick={close} />
          ))}
        </ul>
        <ul className={`${styles.navList} ${styles.navMine}`}>
          {mine.map((item) => (
            <NavLink key={item.href} item={item} active={isActivePath(pathname, item.href === "/my/home" ? "/my" : item.href)} onPick={close} />
          ))}
        </ul>
      </nav>
    </aside>
  );
}
