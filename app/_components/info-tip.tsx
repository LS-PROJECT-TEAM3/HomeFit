"use client";

import { useState } from "react";
import styles from "./ui.module.css";

/** 디자인 시스템 InfoTip: 누르면 설명이 열린다. 마우스를 올려도 title로 보인다. icon이면 동그라미 i 아이콘(Type=Icon), 아니면 "i" 글자(Type=Letter) */
export function InfoTip({ text, label, icon }: { text: string; label: string; icon?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <span className={styles.tip}>
      <button type="button" className={`${styles.tipButton} ${icon ? styles.tipIcon : ""}`} aria-label={label} aria-expanded={open} title={text} onClick={() => setOpen((v) => !v)}>
        {icon ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9.5" /><path d="M12 11v5.5" /><path d="M12 7.5v.01" />
          </svg>
        ) : <span aria-hidden="true" className={styles.tipLetter}>i</span>}
      </button>
      {open ? <span role="tooltip" className={styles.tipPop}>{text}</span> : null}
    </span>
  );
}
