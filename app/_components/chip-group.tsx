"use client";

import { useState } from "react";
import { Icon } from "@/app/_components/icons";
import styles from "@/app/_components/form.module.css";

type Option = { value: string; label: string };

/**
 * 사용자 요청(2026-11-23): 캔버스 흐름1 s2 보드의 여러 개 고르기. 위에 "전체 선택" 줄(체크·일부·빈 네모 + "n / N개 선택됨"),
 * 아래에 체크 칩. 칩은 진짜 체크박스라 키보드로 고르고 폼과 함께 저장된다.
 * allValue: 모두 고르면 칩 값 대신 이 값 하나를 보낸다(공급 유형 "ALL" = 모두)
 */
export function ChipGroup({ name, legend, options, initial, help, allValue, onCount }: { name: string; legend: string; options: Option[]; initial: readonly string[]; help?: string; allValue?: string; onCount?: (count: number) => void }) {
  const [picked, setPicked] = useState<Set<string>>(() => new Set(allValue && initial.includes(allValue) ? options.map((o) => o.value) : initial));
  const all = picked.size === options.length;
  const update = (next: Set<string>) => { setPicked(next); onCount?.(next.size); };
  const toggle = (value: string) => {
    const next = new Set(picked);
    if (next.has(value)) next.delete(value); else next.add(value);
    update(next);
  };
  const sendAll = Boolean(allValue) && all;
  return (
    <fieldset className={styles.chipField}>
      <legend className={styles.srOnly}>{legend}</legend>
      {help ? <p className={styles.help}>{help}</p> : null}
      <div className={styles.chipAll}>
        <button type="button" role="checkbox" aria-checked={all ? true : picked.size === 0 ? false : "mixed"} className={styles.chipAllButton}
          onClick={() => update(all ? new Set() : new Set(options.map((o) => o.value)))}>
          <span className={`${styles.chipBox} ${picked.size > 0 ? styles.chipBoxOn : ""}`} aria-hidden="true">
            {all ? <Icon name="tick" size={14} /> : picked.size > 0 ? <span className={styles.chipDash} /> : null}
          </span>
          전체 선택
        </button>
        <span className={styles.chipCount}><b>{picked.size}</b> / {options.length}개 선택됨</span>
      </div>
      <div className={styles.chips}>
        {sendAll ? <input type="hidden" name={name} value={allValue} /> : null}
        {options.map((o) => (
          <label key={o.value} className={styles.chip}>
            <input type="checkbox" name={sendAll ? undefined : name} value={o.value} checked={picked.has(o.value)} onChange={() => toggle(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
