import Link from "next/link";
import { signUp } from "../actions";
import { CredentialsForm } from "../credentials-form";
import styles from "../auth.module.css";

export const metadata = { title: "회원가입 | HomeFit AI" };

// IA MB_010100_PG 회원가입 (FR-001, spec 001)
export default function SignupPage() {
  return (
    <>
      <div className={styles.titleBox}>
        <h1 className={styles.title}>회원가입</h1>
        <p className={styles.lead}>가입하면 내 집과 공고/정책 조건을 바로 정해요.</p>
      </div>
      <CredentialsForm action={signUp} submitLabel="가입하기" passwordAutoComplete="new-password" passwordHint="8자 이상" />
      <div className={styles.switch}>
        <p className={styles.switchText}>이미 가입하셨나요?</p>
        <Link href="/login" className={styles.secondary}>로그인</Link>
      </div>
    </>
  );
}
