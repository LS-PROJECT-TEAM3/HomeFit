"use client";

import type { MouseEvent } from "react";
import styles from "./knowledge.module.css";

// spec 022 FR-011: 기록 찾기 검색창. PC는 띠 안(v2-know-poster-pc), 휴대폰은 탭 아래 카드(v2-know-find-phone)
const EXAMPLES = ["접수 마감 바뀐 알림", "거절한 알림", "결로 알림"];

type Props = { variant: "pc" | "phone"; action: (form: FormData) => void; pending: boolean; question: string };

/** 예시를 누르면 그 말로 바로 찾는다 */
function ask(event: MouseEvent<HTMLButtonElement>, text: string) {
  const form = event.currentTarget.form;
  const input = form?.elements.namedItem("question");
  if (!form || !(input instanceof HTMLInputElement)) return;
  input.value = text;
  form.requestSubmit();
}

export function SearchForm({ variant, action, pending, question }: Props) {
  const id = `question-${variant}`;
  const v = variant === "pc" ? styles.pc : styles.phone;
  return (
    <form action={action} className={`${styles.search} ${v}`}>
      <label htmlFor={id} className={styles.searchLabel}>찾고 싶은 알림을 말해 보세요</label>
      <div className={styles.searchRow}>
        <input id={id} name="question" className={styles.searchInput} defaultValue={question} maxLength={300} placeholder="예: 결로 알림에 뭘 했지?" autoComplete="off" required />
        <button type="submit" className={styles.searchButton} disabled={pending}>{pending ? "찾는 중…" : "찾기"}</button>
      </div>
      <div className={styles.examples}>
        <span className={styles.examplesLabel}>이렇게 물어 보세요</span>
        {EXAMPLES.map((text) => (
          <button key={text} type="button" className={styles.example} disabled={pending} onClick={(e) => ask(e, text)}>{text}</button>
        ))}
      </div>
      <p className={styles.searchNote}>오른쪽 아래 챗봇은 내 기록과 공공데이터 전체에 묻고, 여기서는 승인/거절로 끝난 알림만 찾아요.</p>
    </form>
  );
}
