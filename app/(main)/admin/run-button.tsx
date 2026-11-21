"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { RunResult } from "./actions";
import styles from "./admin.module.css";

// spec 005 FR-001·FR-002: 실행 버튼과 결과 요약. 실행은 수십 초 걸릴 수 있어 도는 동안 버튼을 막는다
export function RunButton({ label, run }: { label: string; run: () => Promise<RunResult> }) {
  const [result, setResult] = useState<RunResult | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div>
      <button type="button" className={styles.outline} disabled={pending} onClick={() => startTransition(async () => setResult(await run()))}>
        {pending ? "실행 중…" : label}
      </button>
      <div aria-live="polite">
        {result && !result.ok ? <p role="alert" className={`${styles.runResult} ${styles.fail}`}>{result.message}</p> : null}
        {result && result.ok ? (
          <p className={styles.runResult}>
            <strong className={result.status === "succeeded" ? styles.ok : styles.fail}>{result.status === "succeeded" ? "성공" : "수집 오류"}</strong> / {result.summary}{" "}
            <Link href={`/admin/flow?run=${result.runId}`} className={styles.link}>흐름 화면에서 보기</Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
