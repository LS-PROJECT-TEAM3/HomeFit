import { NewPasswordForm } from "../reset-forms";
import styles from "@/app/_components/form.module.css";

export const metadata = { title: "새 비밀번호 | HomeFit AI" };

// IA MB_010301_PG 새 비밀번호 (PRD FR-32, spec 014 FR-002). 메일 링크로 로그인된 사람만 온다(proxy, E5)
export default function NewPasswordPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>새 비밀번호</h1>
        <p className={styles.lead}>앞으로 로그인할 때 쓸 새 비밀번호를 두 번 입력해 주세요.</p>
        <NewPasswordForm />
      </section>
    </main>
  );
}
