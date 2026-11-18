"use client";

import Link from "next/link";
import { useActionState } from "react";
import { searchHistoryAction, type SearchState } from "./actions";
import styles from "@/app/_components/hub.module.css";

const INITIAL: SearchState = { question: "", result: null, error: null };

// spec 005 FR-006: 찾은 기록(링크)은 늘 보이고, AI 답은 찾은 기록만 근거로 붙는다
export function HistorySearch() {
  const [state, action, pending] = useActionState(searchHistoryAction, INITIAL);
  const result = state.result;
  return (
    <>
      <form action={action} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="question">찾을 낱말이나 질문</label>
          <input id="question" name="question" className={styles.input} defaultValue={state.question} maxLength={300} placeholder="예: 결로 알림에 뭐 했지?" required />
        </div>
        <button type="submit" className={styles.primaryButton} disabled={pending}>{pending ? "찾는 중…" : "찾기"}</button>
      </form>
      <div aria-live="polite" className={styles.section}>
        {state.error ? <p role="alert">{state.error}</p> : null}
        {result ? (
          <>
            <h3>답</h3>
            {result.answer ? <p>{result.answer}</p> : null}
            {result.aiFailed ? <p className={styles.muted}>AI 답을 만들지 못했습니다. 아래 찾은 기록을 직접 열어 보세요.</p> : null}
            <h3>찾은 기록 {result.hits.length}건</h3>
            {result.hits.length === 0 ? <p className={styles.muted}>승인·거절로 끝난 알림 가운데 맞는 것이 없습니다.</p> : (
              <ul className={styles.list}>
                {result.hits.map((hit) => (
                  <li key={hit.href ?? hit.title}>
                    {hit.href ? <Link href={hit.href}>{hit.title}</Link> : hit.title}
                    <span className={styles.muted}> · {hit.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}
      </div>
    </>
  );
}
