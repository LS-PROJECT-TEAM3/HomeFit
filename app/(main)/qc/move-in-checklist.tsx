"use client";

import { useActionState, useState } from "react";
import { MOVE_IN_ITEMS, type MoveInChecklist as Checklist } from "@/incident/move-in-checklist";
import { saveMoveInChecklist } from "./checklist/actions";
import styles from "@/app/_components/hub.module.css";

type Props = { homeId: string; homeName: string; initial: Checklist; initialNote: string };

// spec 019 FR-001 (PRD FR-29): 관심 주택 한 곳의 입주 전 점검. 저장하면 그 관심 주택에 남는다
export function MoveInChecklist({ homeId, homeName, initial, initialNote }: Props) {
  const [state, formAction, pending] = useActionState(saveMoveInChecklist, {});
  const [checked, setChecked] = useState<Set<string>>(() => new Set(Object.keys(initial)));
  const toggle = (key: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  return (
    <form action={formAction} className={styles.form} aria-label={`${homeName} 입주 전 점검`}>
      <input type="hidden" name="homeId" value={homeId} />
      <p className={styles.muted} role="status">{checked.size}/{MOVE_IN_ITEMS.length} 확인</p>
      <ul className={`${styles.list} ${styles.plainList}`}>
        {MOVE_IN_ITEMS.map((item) => (
          <li key={item.key}>
            <label>
              <input type="checkbox" name="checked" value={item.key} checked={checked.has(item.key)} onChange={() => toggle(item.key)} /> {item.label}
            </label>
          </li>
        ))}
      </ul>
      <div className={styles.field}>
        <label htmlFor="move-in-note">메모 (500자 안)</label>
        <textarea id="move-in-note" name="note" className={styles.input} rows={3} maxLength={500} defaultValue={initialNote} placeholder="예: 북향이라 오후에 어두움, 욕실 실리콘 교체 필요" />
      </div>
      {state.error ? <p role="alert">{state.error}</p> : null}
      {state.savedAt && !pending ? <p role="status" className={styles.muted}>저장했습니다.</p> : null}
      <button type="submit" className={styles.primaryButton} disabled={pending}>{pending ? "저장하는 중…" : "점검 저장"}</button>
    </form>
  );
}
