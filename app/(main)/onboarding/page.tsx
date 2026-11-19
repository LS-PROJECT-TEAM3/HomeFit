import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoadError, Loading } from "@/app/_components/states";
import { ConditionForm } from "@/app/(main)/my/conditions/condition-form";
import { loadMyCondition } from "@/app/(main)/my/conditions/load";
import { currentUserId } from "@/lib/supabase/server";
import styles from "@/app/_components/form.module.css";

export const metadata = { title: "첫 설정 | HomeFit AI" };

async function OnboardingForm() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  let initial: Awaited<ReturnType<typeof loadMyCondition>>;
  try {
    initial = await loadMyCondition(userId);
  } catch {
    return <LoadError>저장한 조건을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  return <ConditionForm initial={initial} next="/" submitLabel="저장하고 시작하기" />;
}

// IA MB_010200_PG 첫 설정 (FR-002, spec 001). 로그인 쿠키를 읽는 부분은 Suspense 안에 둔다(Next.js 16 Cache Components)
export default function OnboardingPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>공고를 받을 조건</h1>
        <p className={styles.lead}>조건에 맞는 공공임대 공고를 맞춤 공고로 보여 드리고, 팔로우한 공고가 바뀌면 알려 드립니다.</p>
        <Suspense fallback={<Loading />}>
          <OnboardingForm />
        </Suspense>
        <p className={styles.links}>
          <Link href="/">나중에 입력하기</Link>
        </p>
      </section>
    </main>
  );
}
