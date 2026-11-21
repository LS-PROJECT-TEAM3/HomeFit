"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SectionBand } from "@/app/_components/section-band";
import type { HistoryAnswer, HistoryHit } from "@/knowledge/history.server";
import { searchHistoryAction, type SearchState } from "./actions";
import { SearchForm } from "./search-form";
import { KNOWLEDGE_TABS } from "./tabs";
import styles from "./knowledge.module.css";

const INITIAL: SearchState = { question: "", result: null, error: null };
const RESULT_TEXT = { approved: "승인함", rejected: "거절함" } as const;

// spec 005 FR-006 → spec 022 FR-011(캔버스 v2-know-poster-pc, know-none, know-fail): 찾은 기록(링크)은 늘 보이고, AI 답은 찾은 기록만 근거로 붙는다

function Status({ hit }: { hit: HistoryHit }) {
  return <b className={hit.result === "approved" ? styles.approved : styles.rejected}>{RESULT_TEXT[hit.result]}</b>;
}

/** 보드의 "찾은 기록 N건" 2칸 카드. 처리 결과는 왼쪽 색 줄 + 글자 */
function HitCards({ hits }: { hits: HistoryHit[] }) {
  return (
    <ul className={styles.hitGrid}>
      {hits.map((hit) => (
        <li key={hit.n} className={`${styles.hit} ${hit.result === "approved" ? styles.hitApproved : styles.hitRejected}`}>
          <div className={styles.hitTop}><span className={styles.hitDate}>[{hit.n}] {hit.date ?? "날짜 없음"}</span><Status hit={hit} /></div>
          <p className={styles.hitTitle}>{hit.title}</p>
          <p className={styles.hitSummary}>{hit.summary}</p>
          {hit.href ? <Link href={hit.href} className={styles.textLink} aria-label={`${hit.title} 알림 열기`}>알림 열기</Link> : null}
        </li>
      ))}
    </ul>
  );
}

/** AI 답이 없을 때(know-fail-pc): 카드 안 줄 목록 */
function HitRows({ hits }: { hits: HistoryHit[] }) {
  return (
    <section className={styles.stateCard} aria-labelledby="hits-title">
      <h2 id="hits-title" className={styles.rowsTitle}>찾은 기록 {hits.length}건</h2>
      <ul>
        {hits.map((hit) => (
          <li key={hit.n} className={styles.hitRow}>
            <div className={styles.hitRowMain}>
              <span className={styles.hitNo}>{hit.n}</span>
              <div>
                <p className={styles.hitRowTitle}>{hit.title}</p>
                <p className={styles.hitRowMeta}>{hit.date ?? "날짜 없음"}<span aria-hidden="true" className={styles.bar}>|</span><Status hit={hit} /></p>
              </div>
            </div>
            {hit.href ? <Link href={hit.href} className={styles.textLink} aria-label={`${hit.title} 알림 열기`}>알림 열기</Link> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function StateCard({ tag, tone, title, body }: { tag: string; tone?: "caution"; title?: string; body: string }) {
  return (
    <section className={styles.stateCard}>
      <div className={styles.stateBody}>
        <span className={tone === "caution" ? styles.tagCaution : styles.tag}>{tag}</span>
        {title ? <h2 className={styles.stateTitle}>{title}</h2> : null}
        <p className={tone === "caution" ? styles.stateTextStrong : styles.stateText}>{body}</p>
      </div>
    </section>
  );
}

function Result({ result }: { result: HistoryAnswer }) {
  if (result.hits.length === 0) {
    return <StateCard tag="결과 없음" title="맞는 기록이 없어요" body="승인/거절로 끝난 알림 가운데 맞는 것이 없습니다. 다른 낱말로 찾아 보세요." />;
  }
  if (result.aiFailed || !result.answer) {
    return (
      <>
        <StateCard tag="AI 답 없음" tone="caution" body="AI 답을 만들지 못했습니다. 아래 찾은 기록을 직접 열어 보세요." />
        <HitRows hits={result.hits} />
      </>
    );
  }
  const cited = [...new Set([...result.answer.matchAll(/\[(\d+)\]/g)].map((m) => m[1]))];
  const basis = cited.length > 0 ? `아래 기록 ${cited.map((n) => `[${n}]`).join(" ")}를` : "아래 찾은 기록을";
  return (
    <>
      <section className={styles.answer} aria-labelledby="answer-tag">
        <span id="answer-tag" className={styles.answerTag}>AI가 정리한 답 | 내 기록 기준</span>
        <p className={styles.answerText}>{result.answer}</p>
        <p className={styles.answerNote}>AI 답은 {basis} 근거로 만들었어요. 사실은 기록으로 확인하세요.</p>
      </section>
      <h2 className={styles.hitsTitle}>찾은 기록 {result.hits.length}건</h2>
      <HitCards hits={result.hits} />
    </>
  );
}

export function HistorySearch() {
  const [state, action, pending] = useActionState(searchHistoryAction, INITIAL);
  const form = (variant: "pc" | "phone") => <SearchForm variant={variant} action={action} pending={pending} question={state.question} />;
  return (
    <>
      <SectionBand title="AI 도우미" tabs={KNOWLEDGE_TABS} label="AI 도우미 탭" figure={form("pc")} />
      <main className={styles.main}>
        {form("phone")}
        <div aria-live="polite" className={styles.results}>
          {state.error ? <p role="alert" className={styles.error}>{state.error}</p> : null}
          {state.result ? <Result result={state.result} /> : null}
        </div>
      </main>
    </>
  );
}
