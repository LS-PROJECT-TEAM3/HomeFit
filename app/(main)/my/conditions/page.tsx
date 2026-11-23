import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoadError, Loading } from "@/app/_components/states";
import { currentUserId } from "@/lib/supabase/server";
import { ConditionForm } from "./condition-form";
import { loadMyCondition } from "./load";

export const metadata = { title: "공고/정책 조건 | 설정 | HomeFit AI" };

async function ConditionsSection() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  let initial: Awaited<ReturnType<typeof loadMyCondition>>;
  try {
    initial = await loadMyCondition(userId);
  } catch {
    return <LoadError>저장한 조건을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  return <ConditionForm initial={initial} next="stay" submitLabel="저장" />;
}

// IA MY_030100_TB 공고·정책 조건 (FR-002, spec 001)
export default function ConditionsPage() {
  return (
    // spec 022(v2-set-cond-pc): 바깥 카드·제목 없이 접는 칸만(왼쪽 탭이 제목 역할)
    <Suspense fallback={<Loading />}>
      <ConditionsSection />
    </Suspense>
  );
}
