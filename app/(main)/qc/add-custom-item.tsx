"use client";

import { useId, useState, type KeyboardEvent, type RefObject } from "react";
import { checkCustomLabel, CUSTOM_MAX } from "@/incident/move-in-checklist";
import styles from "./qc.module.css";
import own from "./checklist.module.css";

// spec 024 FR-001, E1~E3 (캔버스 v2-qc-check "+ 항목 추가"): 이 관심 주택에만 내 항목을 더한다. 저장은 점검 저장 버튼으로 함께

/** 내 항목 id: 영문 소문자·숫자 8자(서버 검사 /^[a-z0-9]{6,12}$/와 맞춤) */
function newItemId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("");
}

type Props = { existing: string[]; onAdd: (item: { id: string; label: string }) => void; buttonRef: RefObject<HTMLButtonElement | null> };

export function AddCustomItem({ existing, onAdd, buttonRef }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const full = existing.length >= CUSTOM_MAX;
  // 닫은 뒤 키보드 초점을 "+ 항목 추가"로 돌려준다(꽉 차서 못 누르면 그 줄 안내로)
  const close = () => { setOpen(false); setLabel(""); setError(null); requestAnimationFrame(() => buttonRef.current?.focus()); };
  const add = () => {
    const problem = checkCustomLabel(label, existing);
    if (problem) { setError(problem); return; }
    onAdd({ id: newItemId(), label: label.trim() });
    close();
  };
  const keys = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); add(); } // 폼 저장으로 넘어가지 않게
    if (e.key === "Escape") { e.preventDefault(); close(); }
  };
  if (!open) {
    return (
      <li className={`${styles.checkItem} ${styles.checkNote} ${own.addRow}`}>
        <button ref={buttonRef} type="button" className={styles.buttonAssistive} aria-disabled={full} onClick={() => { if (!full) setOpen(true); }}>+ 항목 추가</button>
        <span className={own.help}>{full ? `내 항목은 집마다 ${CUSTOM_MAX}개까지예요.` : `이 집에만 생겨요. ${existing.length} / ${CUSTOM_MAX}`}</span>
      </li>
    );
  }
  return (
    <li className={`${styles.checkItem} ${styles.checkNote}`}>
      <label htmlFor={`${id}-label`} className={styles.checkTitle}>더할 항목 이름</label>
      <div className={own.inlineForm}>
        <input id={`${id}-label`} className={styles.input} value={label} maxLength={60} autoFocus placeholder="예: 주차 자리, 엘리베이터 (40자 안)"
          onChange={(e) => setLabel(e.target.value)} onKeyDown={keys} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} />
        <button type="button" className={styles.buttonPrimary} onClick={add}>추가</button>
        <button type="button" className={styles.buttonAssistive} onClick={close}>취소</button>
        {error ? <p id={`${id}-error`} className={own.error} role="alert">{error}</p> : null}
      </div>
    </li>
  );
}
