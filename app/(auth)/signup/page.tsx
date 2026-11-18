import Link from "next/link";
import { signUp } from "../actions";
import { CredentialsForm } from "../credentials-form";
import styles from "@/app/_components/form.module.css";

export const metadata = { title: "회원가입 | HomeFit AI" };

// IA MB_010100_PG 회원가입 (FR-001, spec 001)
export default function SignupPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>회원가입</h1>
        <p className={styles.lead}>가입하면 공고를 받을 조건을 바로 입력합니다.</p>
        <CredentialsForm
          action={signUp}
          submitLabel="가입하기"
          passwordAutoComplete="new-password"
          passwordHint="8자 이상"
        />
        <p className={styles.links}>
          이미 가입하셨나요? <Link href="/login">로그인</Link>
        </p>
      </section>
    </main>
  );
}
