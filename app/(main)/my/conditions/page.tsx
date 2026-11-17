import { redirect } from "next/navigation";
import { Suspense } from "react";
import { currentUserId } from "@/lib/supabase/server";
import { ConditionForm } from "./condition-form";
import { loadMyCondition } from "./load";
import styles from "../my.module.css";

export const metadata = { title: "공고·정책 조건 | HomeFit AI" };

async function ConditionsSection() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const initial = await loadMyCondition(userId);
  return <ConditionForm initial={initial} next="stay" submitLabel="저장" />;
}

// IA MY_030100_TB 공고·정책 조건 (FR-002, spec 001)
export default function ConditionsPage() {
  return (
    <section className={styles.section} aria-labelledby="conditions-title">
      <h2 id="conditions-title">공고·정책 조건</h2>
      <Suspense fallback={<p role="status">불러오는 중…</p>}>
        <ConditionsSection />
      </Suspense>
    </section>
  );
}
