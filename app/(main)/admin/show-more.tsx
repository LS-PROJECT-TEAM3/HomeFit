"use client";

import { useState, type ReactNode } from "react";
import styles from "./admin.module.css";

// 사용자 요청(2026-11-23): 긴 관리자 표는 처음 10줄만 보이고 "더 보기"로 10줄씩 늘린다(회원 상세 알림, 흐름 화면 다른 실행)
export function ShowMoreRows({ head, rows, step = 10 }: { head: ReactNode; rows: ReactNode[]; step?: number }) {
  const [count, setCount] = useState(step);
  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>{head}</thead>
          <tbody>{rows.slice(0, count)}</tbody>
        </table>
      </div>
      {rows.length > count ? (
        <button type="button" className={`${styles.textButton} ${styles.more}`} onClick={() => setCount((n) => n + step)}>
          더 보기 ({Math.min(count, rows.length)}/{rows.length})
        </button>
      ) : null}
    </>
  );
}
