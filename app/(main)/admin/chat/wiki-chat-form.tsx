"use client";

import { useState } from "react";
import { WIKI_DAILY_LIMIT, WIKI_QUESTION_MAX, checkQuestion, readWikiReply, type WikiChatView } from "@/chat/wiki-answer";
import { InfoTip } from "@/app/_components/info-tip";
import hub from "@/app/_components/hub.module.css";
import styles from "../admin.module.css";
import own from "./wiki-chat.module.css";
import type { WikiGraph } from "@/chat/wiki-graph";
import { WikiGraphView, type GraphFocus } from "./wiki-graph";

type Asked = { view: WikiChatView; remaining: number | null };

/** 질문 하나를 보내고 화면에 보일 값과 남은 질문 수(모르면 null)를 돌려준다 */
async function askWiki(question: string): Promise<Asked> {
  try {
    const response = await fetch("/api/wiki-chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question }) });
    const view = readWikiReply(response.ok, await response.json().catch(() => null));
    return { view, remaining: view.ok ? view.remaining : response.status === 429 ? 0 : null };
  } catch {
    return { view: { ok: false, message: "연결이 끊겼습니다. 잠시 뒤 다시 물어 주세요." }, remaining: null };
  }
}

// spec 012 FR-010·011·014·016: 위키에 묻고, 답·출처(펼쳐서 절 내용)·남은 질문 수를 보인다. FR-017: 답의 출처 쪽을 아래 그래프에서 켠다
export function WikiChatForm({ initialRemaining, graph }: { initialRemaining: number | null; graph: WikiGraph | null }) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [asked, setAsked] = useState("");
  const [view, setView] = useState<WikiChatView | null>(null);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [focus, setFocus] = useState<GraphFocus>({ pages: [], selected: null });

  const send = async () => {
    const checked = checkQuestion(text);
    if (!checked.ok) return setView({ ok: false, message: checked.message });
    setPending(true);
    setAsked(checked.question);
    setView(null);
    const result = await askWiki(checked.question);
    if (result.remaining !== null) setRemaining(result.remaining);
    setView(result.view);
    if (result.view.ok) setFocus({ pages: [...new Set(result.view.sources.map((s) => s.page))], selected: null });
    setPending(false);
  };

  return (
    <>
    <div className={styles.stack}>
    <section className={styles.card} aria-labelledby="wiki-chat-title">
      <div className={styles.head}>
        <h2 id="wiki-chat-title" className={styles.title}>위키에 묻기</h2>
        <InfoTip icon text={'팀 위키(wiki/) 쪽만 근거로 답해요. 위키에 없으면 "위키에 없습니다"라고 답해요.'} label="위키에 묻기 설명 보기" />
      </div>
      <form className={own.form} onSubmit={(e) => { e.preventDefault(); void send(); }}>
        <div className={styles.field}>
          <label htmlFor="wiki-ask" className={styles.label}>질문</label>
          <textarea id="wiki-ask" className={`${styles.select} ${own.textarea}`} rows={3} maxLength={WIKI_QUESTION_MAX} value={text} onChange={(e) => setText(e.target.value)} placeholder="예: 결로 기준은 어디서 왔어?" aria-describedby="wiki-ask-help" />
          <span id="wiki-ask-help" className={styles.help}>
            {text.trim().length}/{WIKI_QUESTION_MAX}자, {remaining === null ? `하루 ${WIKI_DAILY_LIMIT}번까지` : `오늘 남은 질문 ${remaining}번`}
          </span>
        </div>
        <button type="submit" className={hub.primaryButton} disabled={pending || remaining === 0}>{pending ? "찾는 중…" : "묻기"}</button>
      </form>
      <div aria-live="polite">
        {pending ? <p role="status">위키를 찾는 중…</p> : null}
        {view && !view.ok ? <p role="alert" className={own.error}>{view.message}</p> : null}
        {view && view.ok ? <WikiAnswer view={view} asked={asked} /> : null}
      </div>
    </section>
    <WikiGraphView graph={graph} focus={focus} onFocus={setFocus} />
    </div>
    </>
  );
}

/** 답, "모의 답" 표시, 출처(누르면 그 절 내용 펼침) (FR-010·016) */
function WikiAnswer({ view, asked }: { view: Extract<WikiChatView, { ok: true }>; asked: string }) {
  return (
    <div className={own.answer}>
      <p className={styles.help}>질문: {asked}</p>
      {view.isMock ? <p className={`${hub.badge} ${own.mock}`}>모의 답 / 실제 AI 답이 아닙니다</p> : null}
      <p className={own.answerText}>{view.answer}</p>
      {view.sources.length === 0 ? <p className={styles.help}>출처 없음</p> : (
        <>
          <h3 className={own.sourcesTitle}>출처 {view.sources.length}개</h3>
          <ul className={own.sources}>
            {view.sources.map((s) => (
              <li key={s.id}>
                <details>
                  <summary>[{s.id}] {s.page} / {s.heading}</summary>
                  <p className={own.sourceText}>{s.text}</p>
                </details>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
