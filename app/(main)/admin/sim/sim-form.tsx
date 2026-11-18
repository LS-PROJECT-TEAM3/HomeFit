"use client";

import { useState } from "react";
import type { RunResult } from "../actions";
import { RunButton } from "../run-button";
import styles from "@/app/_components/hub.module.css";

type Option = { name: string; help: string };
type Props = { title: string; source: "myhome" | "weather"; options: Option[]; run: (input: { source: "myhome" | "weather"; fixture: string }) => Promise<RunResult> };

// spec 005 FR-002: 묶음 하나를 골라 돌린다
export function SimForm({ title, source, options, run }: Props) {
  const [fixture, setFixture] = useState(options[0]?.name ?? "");
  const id = `sim-${source}`;
  return (
    <section className={styles.card} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{title}</h2>
      <div className={styles.field}>
        <label htmlFor={id}>묶음</label>
        <select id={id} className={styles.input} value={fixture} onChange={(e) => setFixture(e.target.value)}>
          {options.map((o) => <option key={o.name} value={o.name}>{o.name} — {o.help}</option>)}
        </select>
      </div>
      <RunButton label="이 묶음 돌리기" run={() => run({ source, fixture })} />
    </section>
  );
}
