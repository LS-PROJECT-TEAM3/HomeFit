"use client";

import { useState } from "react";
import styles from "./ui.module.css";

/** 디자인 시스템 InfoTip(Letter): "i" 버튼을 누르면 설명이 열린다. 마우스를 올려도 title로 보인다 */
export function InfoTip({ text, label }: { text: string; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className={styles.tip}>
      <button type="button" className={styles.tipButton} aria-label={label} aria-expanded={open} title={text} onClick={() => setOpen((v) => !v)}>
        <span aria-hidden="true" className={styles.tipLetter}>i</span>
      </button>
      {open ? <span role="tooltip" className={styles.tipPop}>{text}</span> : null}
    </span>
  );
}
