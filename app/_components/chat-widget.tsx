"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import styles from "./chat-widget.module.css";

// spec 004 v0.5 FR-007 (사용자 결정 2026-11-18, 자료 넓힘 2026-11-19): 모든 화면의 챗봇. 내 처리 기록·내 정보·공공데이터로만 답하고, 답마다 출처를 보인다
type Source = { label: string; title: string; href?: string };
type Message = { from: "me" | "bot"; text: string; sources?: Source[]; isMock?: boolean; failed?: boolean };

const WELCOME: Message = { from: "bot", text: "안녕하세요. HomeFit 챗봇입니다. 내 알림·일정, 내 집·관심 주택·하자 기록과 공공데이터(마이홈 공고, 청년 주거 정책, 기상청 예보)로 답해 드립니다. 예: \"청년 월세 지원 정책 뭐 있어?\", \"관심 주택 실질 주거비 비교해 줘\"" };

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [messages]);

  const send = async () => {
    const question = text.trim();
    if (!question || pending) return;
    setMessages((prev) => [...prev, { from: "me", text: question }]);
    setText("");
    setPending(true);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question }) });
      const body = (await response.json()) as { answer?: string; sources?: Source[]; isMock?: boolean; error?: string };
      const reply: Message = response.ok && body.answer
        ? { from: "bot", text: body.answer, sources: body.sources ?? [], isMock: body.isMock }
        : { from: "bot", text: body.error ?? "답을 만들지 못했습니다. 잠시 뒤 다시 물어봐 주세요.", failed: true };
      setMessages((prev) => [...prev, reply]);
    } catch {
      setMessages((prev) => [...prev, { from: "bot", text: "연결이 끊겼습니다. 잠시 뒤 다시 물어봐 주세요.", failed: true }]);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={styles.wrap}>
      {open ? (
        <section id="chat-panel" className={styles.panel} aria-label="HomeFit 챗봇" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
          <header className={styles.head}>
            <strong>HomeFit 챗봇</strong> <span className={styles.note}>내 기록·공공데이터로 답함</span>
            <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="챗봇 닫기">✕</button>
          </header>
          <ol ref={list} className={styles.messages} aria-live="polite">
            {messages.map((m, i) => (
              <li key={i} className={m.from === "me" ? styles.me : styles.bot}>
                <span className={styles.who}>{m.from === "me" ? "나" : m.isMock ? "챗봇 (시험용 mock 답)" : "챗봇"}</span>
                {m.text}
                {m.sources && m.sources.length > 0 ? (
                  <ul className={styles.sources}>
                    {m.sources.map((s, j) => (
                      <li key={j}>
                        <span className={styles.sourceLabel}>{s.label}</span>{" "}
                        {s.href ? <Link href={s.href as Route}>{s.title}</Link> : s.title}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
            {pending ? <li className={styles.bot} role="status"><span className={styles.who}>챗봇</span>기록과 공공데이터를 찾는 중…</li> : null}
          </ol>
          <form className={styles.form} onSubmit={(e) => { e.preventDefault(); void send(); }}>
            <label htmlFor="chat-input" className={styles.srOnly}>질문</label>
            <input id="chat-input" ref={input} className={styles.input} value={text} onChange={(e) => setText(e.target.value)} placeholder="예: 결로 알림에 뭘 했지?" maxLength={300} />
            <button type="submit" className={styles.send} disabled={pending}>{pending ? "…" : "보내기"}</button>
          </form>
        </section>
      ) : null}
      <button type="button" className={styles.fab} aria-expanded={open} aria-controls="chat-panel" onClick={() => setOpen((v) => !v)}>
        <Icon name="ai" /> 챗봇
      </button>
    </div>
  );
}
