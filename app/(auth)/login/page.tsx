import Link from "next/link";
import { signIn } from "../actions";
import { CredentialsForm } from "../credentials-form";
import styles from "../auth.module.css";

export const metadata = { title: "로그인 | HomeFit AI" };

// IA MB_010000_PG 로그인 (FR-001, spec 001)
export default function LoginPage() {
  return (
    <>
      <div className={styles.titleBox}>
        <h1 className={styles.title}>로그인</h1>
        <p className={styles.lead}>맞춤 공고와 내 집 변화 알림을 이어서 확인해요.</p>
      </div>
      <CredentialsForm action={signIn} submitLabel="로그인" passwordAutoComplete="current-password" />
      {/* spec 014 FR-001 */}
      <Link href="/reset-password" className={`${styles.textLink} ${styles.forgot}`}>비밀번호를 잊으셨나요?</Link>
      <div className={styles.switch}>
        <p className={styles.switchText}>처음이신가요?</p>
        <Link href="/signup" className={styles.secondary}>회원가입</Link>
      </div>
    </>
  );
}
