"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import styles from "./chat-widget.module.css";

// spec 004 v0.2 FR-007 (사용자 요청 2026-11-18 "AI 도우미뿐만 아니라 챗봇도"): 모든 화면에 뜨는 챗봇 창의 틀.
// 무엇을 근거로 답할지(spec 004 Q4)가 정해지기 전이라 답을 지어내지 않고 "아직 연결 전"이라고만 말한다
type Message = { from: "me" | "bot"; text: string };

const NOT_READY = "챗봇 답변은 아직 연결 전입니다. 무엇을 근거로 답할지 정한 뒤 붙입니다. 지금은 AI 도우미의 처리 기록과 공공데이터 출처를 봐 주세요.";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ from: "bot", text: "안녕하세요. HomeFit 챗봇입니다. 주거 지원 공고, 결로, 주거비에 대해 물어보세요." }]);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const send = () => {
    const question = text.trim();
    if (!question) return;
    setMessages((prev) => [...prev, { from: "me", text: question }, { from: "bot", text: NOT_READY }]);
    setText("");
  };

  return (
    <div className={styles.wrap}>
      {open ? (
        <section id="chat-panel" className={styles.panel} aria-label="HomeFit 챗봇" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
          <header className={styles.head}>
            <strong>HomeFit 챗봇</strong> <span className={styles.note}>(틀만 있음)</span>
            <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="챗봇 닫기">✕</button>
          </header>
          <ol className={styles.messages} aria-live="polite">
            {messages.map((m, i) => (
              <li key={i} className={m.from === "me" ? styles.me : styles.bot}>
                <span className={styles.who}>{m.from === "me" ? "나" : "챗봇"}</span>
                {m.text}
              </li>
            ))}
          </ol>
          <form className={styles.form} onSubmit={(e) => { e.preventDefault(); send(); }}>
            <label htmlFor="chat-input" className={styles.srOnly}>질문</label>
            <input id="chat-input" ref={input} className={styles.input} value={text} onChange={(e) => setText(e.target.value)} placeholder="예: 결로는 왜 생기나요?" maxLength={300} />
            <button type="submit" className={styles.send}>보내기</button>
          </form>
        </section>
      ) : null}
      <button type="button" className={styles.fab} aria-expanded={open} aria-controls="chat-panel" onClick={() => setOpen((v) => !v)}>
        <Icon name="ai" /> 챗봇
      </button>
    </div>
  );
}
