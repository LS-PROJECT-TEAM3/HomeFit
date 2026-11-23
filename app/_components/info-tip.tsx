"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./ui.module.css";

/**
 * 디자인 시스템 InfoTip: 누르면 설명이 열린다. 마우스를 올려도 title로 보인다. icon이면 동그라미 i 아이콘(Type=Icon), 아니면 "i" 글자(Type=Letter).
 * body: 링크가 든 긴 설명(난방비 추정 근거). 열린 칸에는 body를, title에는 text를 쓰고 칸을 넓힌다
 */
export function InfoTip({ text, label, icon, body }: { text: string; label: string; icon?: boolean; body?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  // 사용자 요청(2026-11-23): 열어 둔 설명은 다른 곳을 누르거나(묶음 펼치기·접기 포함) Esc를 누르거나 초점이 떠나면 닫는다
  useEffect(() => {
    if (!open) return;
    const outside = (e: Event) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <span ref={root} className={styles.tip}>
      <button type="button" className={`${styles.tipButton} ${icon ? styles.tipIcon : ""}`} aria-label={label} aria-expanded={open} title={text} onClick={() => setOpen((v) => !v)}>
        {icon ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9.5" /><path d="M12 11v5.5" /><path d="M12 7.5v.01" />
          </svg>
        ) : <span aria-hidden="true" className={styles.tipLetter}>i</span>}
      </button>
      {open ? <span role="tooltip" className={`${styles.tipPop} ${body ? styles.tipPopWide : ""}`}>{body ?? text}</span> : null}
    </span>
  );
}
