"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "@/app/_components/icons";
import { checkCustomLabel, ITEM_NOTE_MAX } from "@/incident/move-in-checklist";
import styles from "./qc.module.css";
import own from "./checklist.module.css";

// spec 024 FR-001~003 (IA QC_100100_TB): 점검 항목 한 줄. 체크, 항목 메모(펼쳐서 200자), 내 항목이면 이름 고치기·지우기
type Props = {
  title: string;
  question?: string;
  checked: boolean;
  note: string;
  onToggle: () => void;
  onNote: (note: string) => void;
  /** 내 항목일 때만: 이 집의 다른 내 항목 이름(같은 이름 검사), 이름 바꾸기·지우기 */
  custom?: { others: string[]; onRename: (label: string) => void; onRemove: () => void };
};

export function ChecklistItem({ title, question, checked, note, onToggle, onNote, custom }: Props) {
  const id = useId();
  const [memoOpen, setMemoOpen] = useState(note !== "");
  return (
    <li className={styles.checkItem}>
      <label className={styles.checkLabel}>
        <input type="checkbox" checked={checked} onChange={onToggle} className={styles.srOnly} />
        <span className={`${styles.checkBox} ${checked ? styles.checkBoxOn : ""}`} aria-hidden="true">{checked ? <Icon name="tick" size={18} /> : null}</span>
        <span className={styles.checkTitle}>{title}</span>
      </label>
      {question ? <p className={styles.checkQuestion}>{question}</p> : <p className={styles.checkQuestion}>내가 더한 항목</p>}
      <div className={own.itemActions}>
        <button type="button" className={own.textButton} aria-expanded={memoOpen} aria-controls={`${id}-memo`} onClick={() => setMemoOpen((v) => !v)}>
          {memoOpen ? "메모 접기" : note ? `메모 보기 (${note.length}자)` : "메모 쓰기"}<span className={styles.srOnly}>: {title}</span>
        </button>
        {custom ? <CustomActions title={title} custom={custom} /> : null}
      </div>
      <div id={`${id}-memo`} className={own.memo} hidden={!memoOpen}>
          <label htmlFor={`${id}-note`} className={styles.srOnly}>{title} 메모</label>
          <textarea id={`${id}-note`} rows={2} maxLength={ITEM_NOTE_MAX} value={note} onChange={(e) => onNote(e.target.value)}
            className={`${styles.input} ${own.memoInput}`} placeholder={`이 항목에서 본 것 (${ITEM_NOTE_MAX}자 안)`} />
      </div>
    </li>
  );
}

function CustomActions({ title, custom }: { title: string; custom: NonNullable<Props["custom"]> }) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [error, setError] = useState<string | null>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  // 바꾸거나 취소한 뒤 초점을 "이름 고치기"로 돌려준다
  const finish = () => { setEditing(false); setError(null); requestAnimationFrame(() => editButton.current?.focus()); };
  const save = () => {
    const problem = checkCustomLabel(draft, custom.others.filter((other) => other !== title));
    if (problem) { setError(problem); return; }
    custom.onRename(draft.trim());
    finish();
  };
  const keys = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); save(); }
    if (e.key === "Escape") { e.preventDefault(); setDraft(title); finish(); }
  };
  if (!editing) {
    return (
      <>
        <button ref={editButton} type="button" className={own.textButton} onClick={() => { setDraft(title); setEditing(true); }}>이름 고치기<span className={styles.srOnly}>: {title}</span></button>
        <button type="button" className={own.textButton} onClick={custom.onRemove}>지우기<span className={styles.srOnly}>: {title}</span></button>
      </>
    );
  }
  return (
    <div className={own.inlineForm}>
      <label htmlFor={`${id}-name`} className={styles.srOnly}>새 항목 이름</label>
      <input id={`${id}-name`} className={styles.input} value={draft} maxLength={60} autoFocus onChange={(e) => setDraft(e.target.value)} onKeyDown={keys}
        aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} />
      <button type="button" className={styles.buttonPrimary} onClick={save}>바꾸기</button>
      <button type="button" className={styles.buttonAssistive} onClick={() => { setDraft(title); finish(); }}>취소</button>
      {error ? <p id={`${id}-error`} className={own.error} role="alert">{error}</p> : null}
    </div>
  );
}
