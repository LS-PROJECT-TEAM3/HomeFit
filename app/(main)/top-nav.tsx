"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/app/_components/icons";
import { activeMenu, isActivePath, type MenuKey } from "@/app/_components/navigation";
import { SignOutButton } from "./my/push/sign-out-button";
import styles from "./top-nav.module.css";

// spec 022 FR-010, IA v1.19 네비게이션 모델: 위쪽 메뉴 맞춤 공고·알림·내 일정·더보기(홈은 로고), 오른쪽 이름 메뉴
// 모양은 디자인 시스템 TopNav와 캔버스 menu-* 보드 값 그대로
type Item = { href: string; label: string };
// "홈"은 메뉴에서 뺐다. 왼쪽 로고가 홈으로 간다(현경 결정 2026-11-21, IA v1.19)
const MAIN: (Item & { key: MenuKey })[] = [
  { key: "notices", href: "/notices", label: "맞춤 공고" },
  { key: "alerts", href: "/incidents", label: "알림" },
  { key: "schedule", href: "/schedule", label: "내 일정" },
];
const MORE: Item[] = [
  { href: "/compare", label: "집 비교" },
  { href: "/qc", label: "집 점검" },
  { href: "/energy", label: "에너지 분석" },
  { href: "/knowledge", label: "AI 도우미" },
];
const SETTINGS: Item = { href: "/my/home", label: "설정" };
const ADMIN: Item = { href: "/admin", label: "관리자" };

type Props = { newAlerts: number; isAdmin: boolean; email: string };

/** 펼침 버튼 하나. Esc로 닫으면 초점이 버튼으로 돌아가고, 바깥을 누르면 닫힌다 */
function useDisclosure() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);
  return { open, setOpen, buttonRef, boxRef };
}

/** 홈으로 가는 로고. 홈에 있으면 화면 읽기 프로그램에 지금 위치로 알린다(메뉴에 "홈"이 없으므로) */
function Logo({ phone, current }: { phone?: boolean; current?: boolean }) {
  return (
    <Link href="/" className={`${styles.logo} ${phone ? styles.logoPhone : ""}`} aria-label="HomeFit 홈" aria-current={current ? "page" : undefined}>
      <svg width="38" height="24" viewBox="0 0 38 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="none" stroke="var(--primary-normal)" strokeWidth="1.6" />
        <circle cx="19" cy="12" r="10" fill="none" stroke="var(--primary-normal)" strokeWidth="1.6" />
        <circle cx="26" cy="12" r="10" fill="var(--primary-normal)" />
      </svg>
      <span className={styles.logoWord}>HomeFit</span>
    </Link>
  );
}

/** 새 알림 수: 점이 아니라 숫자로, 화면 읽기 프로그램에는 "새 알림 N건" */
function Count({ n, phone }: { n: number; phone?: boolean }) {
  if (!n) return null;
  return (
    <>
      <span className={`${styles.count} ${phone ? styles.countPhone : ""}`} aria-hidden="true">{n}</span>
      <span className={styles.srOnly}>새 알림 {n}건</span>
    </>
  );
}

function MenuLink({ item, current, onPick, note }: { item: Item; current: boolean; onPick: () => void; note?: string }) {
  return (
    <li>
      <Link href={item.href} className={styles.menuItem} aria-current={current ? "page" : undefined} onClick={onPick}>
        <span className={styles.menuLabel}><span className={styles.bar} aria-hidden="true" />{item.label}</span>
        {note ? <span className={styles.note}>{note}</span> : null}
      </Link>
    </li>
  );
}

function Dropdown({ label, icon, active, id, align, children }: {
  label: string; icon?: ReactNode; active: boolean; id: string; align: "left" | "right"; children: (close: () => void) => ReactNode;
}) {
  const { open, setOpen, buttonRef, boxRef } = useDisclosure();
  return (
    <span className={styles.slot} ref={boxRef}>
      <button ref={buttonRef} type="button" className={styles.item} aria-expanded={open} aria-controls={id}
        aria-current={active ? "page" : undefined} onClick={() => setOpen((v) => !v)}>
        <span className={styles.label}>{icon}{label}<span className={open ? styles.chevronUp : undefined}><Icon name="chevron-down" size={18} /></span></span>
      </button>
      {open ? <div id={id} className={`${styles.panel} ${align === "right" ? styles.panelRight : ""}`}>{children(() => setOpen(false))}</div> : null}
    </span>
  );
}

function AccountItems({ pathname, isAdmin, email, onPick, phone }: { pathname: string; isAdmin: boolean; email: string; onPick: () => void; phone?: boolean }) {
  return (
    <>
      <div className={phone ? styles.phoneAccount : styles.account}>
        <p className={styles.accountCaption}>로그인한 계정</p>
        <p className={styles.accountEmail}>{email}</p>
      </div>
      <ul className={styles.menuList}>
        <MenuLink item={SETTINGS} current={isActivePath(pathname, "/my")} onPick={onPick} />
        {isAdmin ? <MenuLink item={ADMIN} current={isActivePath(pathname, ADMIN.href)} onPick={onPick} note="관리자만" /> : null}
      </ul>
      {phone ? null : <div className={styles.rule} />}
      <SignOutButton className={`${styles.menuItem} ${styles.signOut}`} />
    </>
  );
}

function PcNav({ pathname, active, newAlerts, isAdmin, email }: Props & { pathname: string; active: MenuKey | null }) {
  return (
    <header className={styles.bar72}>
      <Logo current={active === "home"} />
      <nav aria-label="주 메뉴" className={styles.list}>
        {MAIN.map((m) => (
          <span key={m.key} className={styles.slot}>
            <Link href={m.href} className={styles.item} aria-current={active === m.key ? "page" : undefined}>
              <span className={styles.label}>{m.label}{m.key === "alerts" ? <Count n={newAlerts} /> : null}</span>
            </Link>
          </span>
        ))}
        <Dropdown label="더보기" active={active === "more"} id="menu-more" align="left">
          {(close) => <ul className={styles.menuList}>{MORE.map((m) => <MenuLink key={m.href} item={m} current={isActivePath(pathname, m.href)} onPick={close} />)}</ul>}
        </Dropdown>
        <span className={styles.sep} aria-hidden="true" />
        <Dropdown label="내 계정" icon={<Icon name="user" size={22} />} active={active === "account"} id="menu-account" align="right">
          {(close) => <AccountItems pathname={pathname} isAdmin={isAdmin} email={email} onPick={close} />}
        </Dropdown>
      </nav>
    </header>
  );
}

function PhoneNav({ pathname, active, newAlerts, isAdmin, email }: Props & { pathname: string; active: MenuKey | null }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = () => dialogRef.current?.close();
  const label = `메뉴 열기${newAlerts ? `, 새 알림 ${newAlerts}건` : ""}`;
  return (
    <header className={styles.bar60}>
      <Logo phone current={active === "home"} />
      <span className={styles.right}>
        {newAlerts ? <span className={styles.count} aria-hidden="true">{newAlerts}</span> : null}
        <button type="button" className={styles.menuButton} aria-label={label} aria-haspopup="dialog" onClick={() => dialogRef.current?.showModal()}>
          <span>메뉴</span><Icon name="menu" size={22} />
        </button>
      </span>
      {/* 네이티브 dialog: Esc로 닫히고, 열린 동안 뒤 화면으로 초점이 나가지 않으며, 닫으면 초점이 메뉴 버튼으로 돌아간다 */}
      <dialog ref={dialogRef} className={styles.sheet} aria-label="주 메뉴">
        <div className={styles.bar60}>
          <Logo phone />
          <button type="button" className={styles.menuButton} onClick={close}><span>닫기</span><Icon name="close" size={22} /></button>
        </div>
        <nav aria-label="주 메뉴" className={styles.sheetNav}>
          <ul className={styles.menuList}>
            {MAIN.map((m) => (
              <li key={m.key}>
                <Link href={m.href} className={styles.sheetMain} aria-current={active === m.key ? "page" : undefined} onClick={close}>
                  <span className={styles.menuLabel}><span className={styles.bar} aria-hidden="true" />{m.label}</span>
                  {m.key === "alerts" ? <Count n={newAlerts} phone /> : null}
                </Link>
              </li>
            ))}
          </ul>
          <p className={styles.group}>더보기</p>
          <ul className={`${styles.menuList} ${styles.sheetSub}`}>{MORE.map((m) => <MenuLink key={m.href} item={m} current={isActivePath(pathname, m.href)} onPick={close} />)}</ul>
          <p className={styles.group}>계정</p>
          <div className={styles.sheetSub}><AccountItems pathname={pathname} isAdmin={isAdmin} email={email} onPick={close} phone /></div>
        </nav>
      </dialog>
    </header>
  );
}

/** PC(960px 이상)는 위쪽 메뉴줄, 휴대폰은 메뉴 버튼을 누르면 전체 화면 메뉴 */
export function TopNav(props: Props) {
  const pathname = usePathname();
  const active = activeMenu(pathname);
  return (
    <>
      <PcNav {...props} pathname={pathname} active={active} />
      <PhoneNav {...props} pathname={pathname} active={active} />
    </>
  );
}
