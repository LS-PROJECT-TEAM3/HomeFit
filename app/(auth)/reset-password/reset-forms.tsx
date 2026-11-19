"use client";

import { useActionState } from "react";
import { requestPasswordReset, updatePassword, type AuthState } from "../actions";
import { MIN_PASSWORD } from "@/lib/supabase/auth-rules";
import styles from "@/app/_components/form.module.css";

function Messages({ state }: { state: AuthState }) {
  return (
    <>
      {state.error ? <p className={styles.alert} role="alert">{state.error}</p> : null}
      {state.notice ? <p className={styles.notice} role="status">{state.notice}</p> : null}
    </>
  );
}

// IA MB_010300_PG, spec 014 FR-001: 재설정 메일 요청
export function ResetRequestForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, {});
  return (
    <form action={formAction} className={styles.form} noValidate>
      <Messages state={state} />
      <div className={styles.field}>
        <label className={styles.label} htmlFor="email">가입한 이메일</label>
        <input id="email" name="email" type="email" autoComplete="email" required className={styles.input} />
      </div>
      <button type="submit" className={styles.primary} disabled={pending}>
        {pending ? "보내는 중…" : "재설정 메일 받기"}
      </button>
    </form>
  );
}

// IA MB_010301_PG, spec 014 FR-002: 새 비밀번호 정하기
export function NewPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, {});
  return (
    <form action={formAction} className={styles.form} noValidate>
      <Messages state={state} />
      <div className={styles.field}>
        <label className={styles.label} htmlFor="password">새 비밀번호</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required className={styles.input} aria-describedby="password-hint" />
        <span id="password-hint" className={styles.hint}>{MIN_PASSWORD}자 이상</span>
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="confirm">새 비밀번호 확인</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className={styles.input} />
      </div>
      <button type="submit" className={styles.primary} disabled={pending}>
        {pending ? "저장하는 중…" : "새 비밀번호 저장"}
      </button>
    </form>
  );
}
