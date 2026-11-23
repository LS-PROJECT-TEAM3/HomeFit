"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { Icon } from "@/app/_components/icons";
import { InfoTip } from "@/app/_components/info-tip";
import styles from "@/app/_components/form.module.css";

/**
 * 사용자 요청(2026-11-18) "내 정보 입력이 너무 많고 보기 불편": 칸 묶음을 접는다.
 * 브라우저 기본 details/summary라 키보드(Enter·Space)로 열고 닫히고, 접혀 있어도 칸은 폼과 함께 저장된다.
 * status는 "입력함 4/5"처럼 글자로 보인다(색만으로 구분하지 않음, 디자인 기본선 5)
 */
/**
 * mark: 제목 옆 필수 * 또는 "선택" 네모(캔버스 흐름1 s1·s2 보드). tip: 그 뒤 설명 아이콘.
 * 사용자 요청(2026-11-23): 제목 → 표시 → 설명 아이콘 순서로 모든 묶음이 같은 자리에 둔다. 아이콘을 눌러도 칸이 접히지 않게 막는다
 */
export function Fold({ title, status, open, tip, mark, children }: { title: string; status?: string; open?: boolean; tip?: string; mark?: "required" | "optional"; children: React.ReactNode }) {
  const memory = useContext(FoldMemory);
  const remembered = memory?.current.get(title) ?? false;
  // 사용자 요청(2026-11-23): 머리를 눌러 펼치면 그 묶음이 화면 위쪽에 오게 옮긴다(저장 뒤 다시 그리거나 오류로 펼칠 때는 옮기지 않음)
  const clicked = useRef(false);
  const toggled = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    const details = e.currentTarget;
    memory?.current.set(title, details.open);
    if (details.open && clicked.current) details.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    clicked.current = false;
  };
  return (
    <details className={styles.fold} open={Boolean(open) || remembered} onToggle={toggled}>
      <summary className={styles.foldSummary} onClick={(e) => { clicked.current = !e.defaultPrevented; }}>
        <span className={styles.foldHead}>
          <span className={styles.foldTitle}>{title}</span>
          {mark === "required" ? <><span className={styles.foldReq} aria-hidden="true">*</span><span className={styles.srOnly}>필수</span></> : null}
          {mark === "optional" ? <span className={styles.foldOptional}>선택</span> : null}
          {tip ? <span className={styles.foldTip} onClick={(e) => e.preventDefault()}><InfoTip icon text={tip} label={`${title} 설명 보기`} /></span> : null}
        </span>
        {status ? <span className={styles.foldStatus}>{status}</span> : null}
        <span className={styles.foldChevron} aria-hidden="true"><Icon name="chevron-down" size={20} /></span>
      </summary>
      <div className={styles.foldBody}>{children}</div>
    </details>
  );
}

/** 채운 칸 수 → "입력함 n/m" 또는 "비어 있음" */
export function filledStatus(values: readonly string[]): string {
  const filled = values.filter((v) => v.trim() !== "").length;
  return filled === 0 ? "비어 있음" : `입력함 ${filled}/${values.length}`;
}

// 사용자 요청(2026-11-23): 저장하면 폼이 새로 그려지며 펼친 묶음이 접혔다. 폼 바깥에 펼침 상태를 기억해 두고
// 다시 그릴 때 그대로 펼친다(오류가 있거나 첫 설정이면 open으로 늘 펼침)
const FoldMemory = createContext<React.RefObject<Map<string, boolean>> | null>(null);

export function FoldMemoryProvider({ children }: { children: ReactNode }) {
  const memory = useRef(new Map<string, boolean>());
  return <FoldMemory.Provider value={memory}>{children}</FoldMemory.Provider>;
}
