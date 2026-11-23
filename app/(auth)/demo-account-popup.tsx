"use client";

import { useState } from "react";
import { Icon } from "@/app/_components/icons";
import styles from "./auth.module.css";

// 사용자 요청(2026-11-23, AI 해커톤 제출): 가입하지 않고 둘러볼 사람을 위해 오른쪽 아래 팝업에 일반 계정을 적어 둔다.
// 버튼으로 바로 들어가지 않고, 적힌 아이디·비밀번호를 로그인 칸에 직접 넣는다. 닫으면 작은 버튼으로 다시 연다
// 계정 값은 환경변수 DEMO_USER_EMAIL·DEMO_USER_PASSWORD(저장소에 남기지 않음). 모두가 같은 계정을 같이 쓴다
export function DemoAccountPopup({ email, password }: { email: string; password: string }) {
  const [open, setOpen] = useState(true);
  if (!open) {
    return <button type="button" className={`${styles.demo} ${styles.demoReopen}`} onClick={() => setOpen(true)}>체험 계정 보기</button>;
  }
  return (
    <section className={`${styles.demo} ${styles.demoCard}`} aria-labelledby="demo-title">
      <div className={styles.demoHead}>
        <h2 id="demo-title" className={styles.demoTitle}>회원가입 없이 둘러보기</h2>
        <button type="button" className={styles.demoClose} aria-label="체험 계정 안내 닫기" onClick={() => setOpen(false)}><Icon name="close" size={18} /></button>
      </div>
      <p className={styles.demoText}>이미 있는 계정으로 바로 확인할 수 있어요. 아래 아이디와 비밀번호를 로그인 칸에 입력해 주세요.</p>
      <dl className={styles.demoRows}>
        <div><dt>아이디</dt><dd>{email}</dd></div>
        <div><dt>비밀번호</dt><dd>{password}</dd></div>
      </dl>
    </section>
  );
}
