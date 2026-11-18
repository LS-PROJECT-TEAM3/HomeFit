import Link from "next/link";
import { signIn } from "../actions";
import { CredentialsForm } from "../credentials-form";
import styles from "@/app/_components/form.module.css";

export const metadata = { title: "로그인 | HomeFit AI" };

// IA MB_010000_PG 로그인 (FR-001, spec 001)
export default function LoginPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>로그인</h1>
        <p className={styles.lead}>내 집의 결로 위험과 조건에 맞는 주거 지원 공고 변화를 알림으로 받아 보세요.</p>
        <CredentialsForm action={signIn} submitLabel="로그인" passwordAutoComplete="current-password" />
        <p className={styles.links}>
          처음이신가요? <Link href="/signup">회원가입</Link>
        </p>
      </section>
    </main>
  );
}
