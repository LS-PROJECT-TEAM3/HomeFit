import type { AdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

// ERD runs·run_steps: 흐름 화면(P3-08)과 수집 현황(FR-021)이 이 기록으로 그린다
export type RunTrigger = "scheduled" | "manual" | "simulation";
export type StepName = "collect" | "compare" | "detect" | "draft_plan" | "await_approval" | "record";
export type StepStatus = "succeeded" | "failed" | "waiting" | "skipped";

export type StepRecord = {
  name: StepName;
  status: StepStatus;
  itemsIn?: number;
  itemsOut?: number;
  detail?: Json;
};

const STEP_ORDER: Record<StepName, number> = {
  collect: 1, compare: 2, detect: 3, draft_plan: 4, await_approval: 5, record: 6,
};

export async function startRun(db: AdminClient, sourceCode: string, trigger: RunTrigger): Promise<string> {
  const { data, error } = await db
    .from("runs")
    .insert({ source_code: sourceCode, trigger })
    .select("id")
    .single();
  if (error || !data) throw new Error(`실행 기록을 만들지 못했습니다: ${error?.message ?? "응답 없음"}`);
  return data.id;
}

export async function recordStep(db: AdminClient, runId: string, step: StepRecord): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await db.from("run_steps").insert({
    run_id: runId,
    step_order: STEP_ORDER[step.name],
    step_name: step.name,
    status: step.status,
    items_in: step.itemsIn ?? null,
    items_out: step.itemsOut ?? null,
    detail: step.detail ?? null,
    started_at: now,
    finished_at: now,
  });
  if (error) throw new Error(`실행 단계를 기록하지 못했습니다: ${error.message}`);
}

/** 실패 메시지는 키를 가린 뒤 넘겨야 한다 (FR-004) */
export async function finishRun(db: AdminClient, runId: string, errorMessage: string | null): Promise<void> {
  const { error } = await db
    .from("runs")
    .update({
      status: errorMessage ? "failed" : "succeeded",
      error_message: errorMessage,
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId);
  if (error) throw new Error(`실행 기록을 마치지 못했습니다: ${error.message}`);
}
