import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ConditionForm } from "@/app/(main)/my/conditions/condition-form";
import { loadMyCondition } from "@/app/(main)/my/conditions/load";
import { currentUserId } from "@/lib/supabase/server";
import styles from "@/app/_components/form.module.css";

export const metadata = { title: "첫 설정 | HomeFit AI" };

async function OnboardingForm() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const initial = await loadMyCondition(userId);
  return <ConditionForm initial={initial} next="/" submitLabel="저장하고 시작하기" />;
}

// IA MB_010200_PG 첫 설정 (FR-002, spec 001). 로그인 쿠키를 읽는 부분은 Suspense 안에 둔다(Next.js 16 Cache Components)
export default function OnboardingPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>공고를 받을 조건</h1>
        <p className={styles.lead}>조건에 맞는 공공임대 공고를 맞춤 공고로 보여 드리고, 팔로우한 공고가 바뀌면 알려 드립니다.</p>
        <Suspense fallback={<p role="status">불러오는 중…</p>}>
          <OnboardingForm />
        </Suspense>
        <p className={styles.links}>
          <Link href="/">나중에 입력하기</Link>
        </p>
      </section>
    </main>
  );
}
