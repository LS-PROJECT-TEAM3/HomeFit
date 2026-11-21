"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@/app/_components/icons";
import type { PlanStepView } from "@/incident/plan-steps";
import styles from "./alert.module.css";

// spec 022(캔버스 v2-s6-pc DS Fold + PlanStep): "일정 N개가 내 일정에 새로 들어가요" 접는 칸. 처음에는 접힘(보드), 펼치면 날짜별 줄
export function PlanFold({ title, range, steps, children }: { title: string; range: string; steps: PlanStepView[]; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className={styles.fold} aria-labelledby="plan-fold-title">
      <button type="button" className={styles.foldHead} aria-expanded={open} aria-controls="plan-fold-body" onClick={() => setOpen((v) => !v)}>
        <span className={styles.foldText}>
          <span id="plan-fold-title" className={styles.foldTitle}>{title}</span>
          {range ? <span className={styles.foldDesc}>{range}</span> : null}
        </span>
        <span className={styles.foldAct}>{open ? "접기" : "펼치기"}<span className={open ? styles.up : undefined}><Icon name="chevron-down" size={18} /></span></span>
      </button>
      <div id="plan-fold-body" hidden={!open}>
        <ul className={styles.steps}>
          {steps.map((step, i) => (
            <li key={i} className={`${styles.step} ${step.deadline ? styles.stepDeadline : ""}`}>
              <span className={styles.stepDate}>{step.date} <span className={styles.stepWeek}>{step.weekday}{step.deadline ? " 마감" : ""}</span></span>
              <span className={styles.stepTitle}>{step.title}</span>
            </li>
          ))}
        </ul>
        {children}
      </div>
    </section>
  );
}
