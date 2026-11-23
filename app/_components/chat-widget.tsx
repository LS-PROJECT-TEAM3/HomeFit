"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import styles from "./chat-widget.module.css";

// spec 004 v0.5 FR-007 (사용자 결정 2026-11-18, 자료 넓힘 2026-11-19): 모든 화면의 챗봇. 내 처리 기록·내 정보·공공데이터로만 답하고, 답마다 출처를 보인다.
// spec 022 FR-013(캔버스 v2-chat-new-*, H 4-6): PC는 오른쪽 옆 창, 휴대폰은 아래에서 올라오는 창. 이름은 "챗봇" 그대로(현경 결정 2026-11-22, 더보기의 AI 도우미 화면과 구분)
type Source = { label: string; title: string; href?: string };
type Reply =
  | { from: "me"; text: string }
  | { from: "bot"; kind: "answer"; text: string; sources: Source[]; isMock: boolean }
  | { from: "bot"; kind: "none"; text: string }
  | { from: "bot"; kind: "failed"; text: string; question: string };

const EXAMPLES = ["관심 주택 실질 주거비 비교해 줘", "결로 알림에 뭘 했지?", "이번 달 전기요금이 왜 올랐어?"];

/** 관심 주택 자료를 쓴 답에는 에너지비가 추정값이라고 알린다(보드 "에너지비는 추정값이에요") */
const usesEstimate = (sources: Source[]) => sources.some((s) => s.label.includes("관심 주택"));

async function ask(question: string): Promise<Reply> {
  try {
    const response = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question }) });
    const body = (await response.json()) as { answer?: string; sources?: Source[]; isMock?: boolean; error?: string };
    if (!response.ok || !body.answer) return { from: "bot", kind: "failed", text: body.error ?? "답을 만들지 못했습니다. 잠시 뒤 다시 물어봐 주세요.", question };
    // 근거 자료가 하나도 없으면 "관련 기록 없음"(서버는 찾은 자료가 없으면 AI를 부르지 않는다)
    if (!body.sources || body.sources.length === 0) return { from: "bot", kind: "none", text: body.answer };
    return { from: "bot", kind: "answer", text: body.answer, sources: body.sources, isMock: body.isMock === true };
  } catch {
    return { from: "bot", kind: "failed", text: "연결이 끊겼을 수 있어요. 잠시 뒤 다시 시도해 주세요.", question };
  }
}

function Answer({ reply }: { reply: Extract<Reply, { kind: "answer" }> }) {
  return (
    <div className={styles.answer}>
      <span className={styles.badge}>{reply.isMock ? "시험용 mock 답" : "내 기록 / 공공데이터로 답함"}</span>
      <p className={styles.answerText}>{reply.text}</p>
      <div className={styles.sources}>
        <ul className={styles.sourceList}>
          {reply.sources.map((s, i) => (
            <li key={i} className={styles.source}>
              <span className={styles.sourceHead}>출처</span>
              <span>{s.label} | {s.href ? <Link href={s.href as Route} className={styles.sourceLink}>{s.title}</Link> : s.title}</span>
            </li>
          ))}
        </ul>
        {usesEstimate(reply.sources) ? <p className={styles.caution}><Icon name="caution" size={16} />에너지비는 추정값이에요</p> : null}
      </div>
    </div>
  );
}

function BotMessage({ reply, onRetry }: { reply: Exclude<Reply, { from: "me" }>; onRetry: (q: string) => void }) {
  if (reply.kind === "answer") return <Answer reply={reply} />;
  if (reply.kind === "none") {
    return (
      <div className={styles.answer}>
        <span className={styles.stateTag}>관련 기록 없음</span>
        <p className={styles.answerText}>{reply.text} 아직 승인하거나 거절한 대응이 없을 수 있어요.</p>
        <Link href="/incidents" className={styles.textLink}>알림 보러 가기</Link>
      </div>
    );
  }
  return (
    <div className={styles.answer} role="alert">
      <span className={styles.failTag}>답을 만들지 못했어요</span>
      <p className={styles.answerText}>{reply.text}</p>
      <button type="button" className={styles.retry} onClick={() => onRetry(reply.question)}>다시 시도</button>
    </div>
  );
}

export function ChatWidget() {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Reply[]>([]);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [messages, pending]);

  const run = async (question: string, before: (prev: Reply[]) => Reply[]) => {
    if (pending) return;
    setMessages(before);
    setText("");
    setPending(true);
    const reply = await ask(question);
    setMessages((prev) => [...prev, reply]);
    setPending(false);
  };
  const send = (raw: string) => {
    const question = raw.trim();
    if (question) void run(question, (prev) => [...prev, { from: "me", text: question }]);
  };
  // 다시 시도는 실패 말풍선을 지우고 같은 질문을 다시 보낸다
  const retry = (question: string) => void run(question, (prev) => prev.slice(0, -1));

  const openPanel = () => {
    dialog.current?.showModal();
    setOpen(true);
    input.current?.focus();
  };

  const last = messages.at(-1);
  const lastQuestion = [...messages].reverse().find((m) => m.from === "me")?.text;
  const followUps = last?.from === "bot" && last.kind === "answer" && !pending ? EXAMPLES.filter((q) => q !== lastQuestion).slice(0, 2) : [];

  return (
    <>
      <button type="button" className={styles.fab} aria-haspopup="dialog" aria-expanded={open} onClick={openPanel}>
        <Icon name="ai" /> 챗봇
      </button>
      {/* 네이티브 dialog: Esc로 닫히고, 닫으면 초점이 챗봇 버튼으로 돌아간다. 바깥 어두운 곳을 눌러도 닫힌다 */}
      <dialog
        ref={dialog}
        className={styles.panel}
        aria-labelledby="chat-title"
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
      >
        <div className={styles.head}>
          <span className={styles.grabber} aria-hidden="true" />
          <div className={styles.headRow}>
            <span className={styles.avatar} aria-hidden="true"><Icon name="ai" /></span>
            <div className={styles.headText}>
              <h2 id="chat-title" className={styles.title}>챗봇</h2>
              <p className={styles.subtitle}>내 기록과 공공데이터로 답해요</p>
            </div>
            <button type="button" className={styles.newChat} onClick={() => setMessages([])} disabled={messages.length === 0 || pending}>새 대화</button>
            <button type="button" className={styles.close} onClick={() => dialog.current?.close()} aria-label="챗봇 닫기"><Icon name="close" size={22} /></button>
          </div>
        </div>
        <div ref={list} className={styles.body} aria-live="polite">
          {messages.length === 0 ? (
            <div className={styles.welcome}>
              <p className={styles.answerText}>안녕하세요. 내 알림/일정, 내 집/관심 주택/하자 기록, 공공데이터에서 찾아 답해요.</p>
              <p className={styles.chipsLabel}>이런 걸 물어보세요</p>
              <div className={styles.chips}>
                {EXAMPLES.map((q) => <button key={q} type="button" className={styles.chip} onClick={() => send(q)}>{q}</button>)}
              </div>
            </div>
          ) : null}
          {messages.map((m, i) => (m.from === "me"
            ? <p key={i} className={styles.me}>{m.text}</p>
            : <BotMessage key={i} reply={m} onRetry={retry} />))}
          {pending ? <p className={styles.pending} role="status">기록과 공공데이터를 찾는 중이에요</p> : null}
          {followUps.length > 0 ? (
            <>
              <p className={styles.chipsLabel}>이어서 물어보기</p>
              <div className={styles.chips}>
                {followUps.map((q) => <button key={q} type="button" className={styles.chip} onClick={() => send(q)}>{q}</button>)}
              </div>
            </>
          ) : null}
        </div>
        <div className={styles.foot}>
          <form className={styles.form} onSubmit={(e) => { e.preventDefault(); send(text); }}>
            <label htmlFor="chat-input" className={styles.srOnly}>질문</label>
            <input id="chat-input" ref={input} className={styles.input} value={text} onChange={(e) => setText(e.target.value)} placeholder="궁금한 걸 물어보세요" maxLength={300} autoComplete="off" />
            <button type="submit" className={styles.send} disabled={pending} aria-label="보내기"><Icon name="send" /></button>
          </form>
          <p className={styles.notice}>계약이나 금융 거래는 대신 판단하지 않아요. 답은 참고용이에요.</p>
        </div>
      </dialog>
    </>
  );
}
