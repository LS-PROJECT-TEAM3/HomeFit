"use client";

import { useEffect, useState } from "react";
import { filledCount, PROGRESS_FIELDS } from "./progress";
import styles from "../setup.module.css";

const BAR_COUNT = 15;

/** 왼쪽 진행 막대 "입력함 n/m". 처음엔 저장 값으로, 입력·고르기를 할 때마다 오른쪽 폼의 지금 값으로 다시 센다 */
export function LiveProgress({ step, initial }: { step: 1 | 2; initial: number }) {
  const fields = PROGRESS_FIELDS[step];
  const total = fields.length;
  const [filled, setFilled] = useState(initial);
  useEffect(() => {
    const form = document.querySelector<HTMLFormElement>("main form");
    if (!form) return;
    let frame = 0;
    // 칩 "전체 선택"처럼 화면이 다시 그려진 뒤 값이 바뀌는 경우가 있어 다음 프레임에 센다
    const recount = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setFilled(filledCount(new FormData(form).entries(), fields)));
    };
    recount();
    for (const type of ["input", "change", "click"]) form.addEventListener(type, recount);
    return () => {
      cancelAnimationFrame(frame);
      for (const type of ["input", "change", "click"]) form.removeEventListener(type, recount);
    };
  }, [fields]);
  const on = Math.round((filled / total) * BAR_COUNT);
  return (
    <div className={styles.progress}>
      <span className={styles.bars} aria-hidden="true">{Array.from({ length: BAR_COUNT }, (_, i) => <span key={i} className={`${styles.bar} ${i < on ? styles.barOn : ""}`} />)}</span>
      <span className={styles.progressText} aria-live="polite">입력함 {filled}/{total}</span>
    </div>
  );
}
