"use client";

import { useActionState } from "react";
import type { AuthState } from "./actions";
import styles from "@/app/_components/form.module.css";

type Props = {
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  submitLabel: string;
  passwordAutoComplete: "current-password" | "new-password";
  passwordHint?: string;
};

// 로그인·가입이 함께 쓰는 이메일·비밀번호 입력. 바뀌는 것은 넘겨받은 값뿐이다
export function CredentialsForm({ action, submitLabel, passwordAutoComplete, passwordHint }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className={styles.form} noValidate>
      {state.error ? (
        <p className={styles.alert} role="alert">
          {state.error}
        </p>
      ) : null}
      {state.notice ? (
        <p className={styles.notice} role="status">
          {state.notice}
        </p>
      ) : null}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="email">
          이메일
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className={styles.input} />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="password">
          비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={passwordAutoComplete}
          required
          className={styles.input}
          aria-describedby={passwordHint ? "password-hint" : undefined}
        />
        {passwordHint ? (
          <span id="password-hint" className={styles.hint}>
            {passwordHint}
          </span>
        ) : null}
      </div>
      <button type="submit" className={styles.primary} disabled={pending}>
        {pending ? "처리 중…" : submitLabel}
      </button>
    </form>
  );
}
