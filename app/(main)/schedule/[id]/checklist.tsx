"use client";

import { useState, useTransition } from "react";
import type { ChecklistState } from "@/incident/schedule.server";
import { toggleChecklistItem } from "../actions";
import styles from "../schedule.module.css";

// IA SC_060100_PG 일정 상세의 체크리스트 (FR-013, spec 001)
export function Checklist({ scheduleId, items }: { scheduleId: string; items: ChecklistState[] }) {
  const [checked, setChecked] = useState(items.map((item) => item.done));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (index: number) =>
    startTransition(async () => {
      const result = await toggleChecklistItem(scheduleId, index);
      if (result.error) return setError(result.error);
      setError(null);
      setChecked((prev) => prev.map((value, i) => (i === index ? !value : value)));
    });

  return (
    <>
      <ul className={styles.checklist}>
        {items.map((item, i) => (
          <li key={i}>
            <label className={styles.check}>
              <input type="checkbox" checked={checked[i]} disabled={pending} onChange={() => toggle(i)} />
              <span>{item.label}{item.dueOn ? ` (마감 ${item.dueOn})` : ""}</span>
            </label>
          </li>
        ))}
      </ul>
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    </>
  );
}
