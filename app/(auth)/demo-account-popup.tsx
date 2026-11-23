"use client";

import { useState } from "react";
import { Icon } from "@/app/_components/icons";
import styles from "./auth.module.css";

// 사용자 요청(2026-11-23, AI 해커톤 제출): 가입하지 않고 둘러볼 사람을 위해 오른쪽 아래 팝업에 일반 계정을 적어 둔다.
// 버튼으로 바로 들어가지 않고, 적힌 아이디·비밀번호를 로그인 칸에 직접 넣는다. 닫으면 작은 버튼으로 다시 연다
// 사용자 요청(2026-11-23): 아이디·비밀번호 옆 복사 아이콘(배경 없이 아이콘만, 복사되면 체크). 복사하지 못하면(브라우저가 막음) 직접 고르라고 알린다
function CopyRow({ label, value }: { label: string; value: string }) {
  const [result, setResult] = useState<"idle" | "copied" | "failed">("idle");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setResult("copied");
    } catch {
      setResult("failed");
    }
  };
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
      <button type="button" className={styles.demoCopy} onClick={copy} aria-label={result === "copied" ? `${label} 복사함` : `${label} 복사`} title={`${label} 복사`}><Icon name={result === "copied" ? "tick" : "copy"} size={18} /></button>
      {result === "failed" ? <span className={styles.demoCopyError} role="status">복사하지 못했어요. 글자를 직접 골라 복사해 주세요.</span> : <span className={styles.srOnly} role="status">{result === "copied" ? `${label}를 복사했어요` : ""}</span>}
    </div>
  );
}

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
        <CopyRow label="아이디" value={email} />
        <CopyRow label="비밀번호" value={password} />
      </dl>
    </section>
  );
}
