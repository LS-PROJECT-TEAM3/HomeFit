import Link from "next/link";
import { Suspense } from "react";
import { ResetRequestForm } from "./reset-forms";
import styles from "@/app/_components/form.module.css";

export const metadata = { title: "비밀번호 재설정 | HomeFit AI" };

// spec 014 FR-003: 메일 링크 확인이 실패하면 /auth/confirm이 ?error=link 로 돌려보낸다
async function LinkError({ searchParams }: PageProps<"/reset-password">) {
  const { error } = await searchParams;
  if (error !== "link") return null;
  return <p className={styles.alert} role="alert">링크가 만료됐거나 이미 쓰였습니다. 메일을 다시 요청해 주세요.</p>;
}

// IA MB_010300_PG 비밀번호 재설정 (PRD FR-32, spec 014 FR-001)
export default function ResetPasswordPage(props: PageProps<"/reset-password">) {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>비밀번호 재설정</h1>
        <p className={styles.lead}>가입한 이메일을 넣으면 새 비밀번호를 정할 수 있는 링크를 메일로 보내 드립니다.</p>
        <Suspense fallback={null}>
          <LinkError {...props} />
        </Suspense>
        <ResetRequestForm />
        <p className={styles.links}>
          비밀번호가 생각났나요? <Link href="/login">로그인</Link>
        </p>
      </section>
    </main>
  );
}
