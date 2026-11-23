"use client";

import { useState } from "react";
import type { RunResult } from "../actions";
import { RunButton } from "../run-button";
import styles from "../admin.module.css";

type Option = { name: string; help: string };
type Props = { title: string; source: "myhome" | "weather" | "rent"; options: Option[]; run: (input: { source: "myhome" | "weather" | "rent"; fixture: string }) => Promise<RunResult> };

// spec 005 FR-002: 묶음 하나를 골라 돌린다
export function SimForm({ title, source, options, run }: Props) {
  const [fixture, setFixture] = useState(options[0]?.name ?? "");
  const id = `sim-${source}`;
  return (
    <section className={styles.sim} aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className={styles.sourceName}>{title}</h3>
      <div className={styles.field}>
        <label htmlFor={id} className={styles.label}>묶음</label>
        <select id={id} className={styles.select} value={fixture} onChange={(e) => setFixture(e.target.value)}>
          {options.map((o) => <option key={o.name} value={o.name}>{o.name} — {o.help}</option>)}
        </select>
      </div>
      <RunButton label="이 묶음 돌리기" run={() => run({ source, fixture })} />
    </section>
  );
}
