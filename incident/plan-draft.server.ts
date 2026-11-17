import { PLAN_JSON_SCHEMA, PLAN_SYSTEM_PROMPT, buildPlanPrompt, parsePlanDraft, type PlanDraft } from "@/incident/plan-draft";
import { callLlm } from "@/lib/llm/call.server";
import type { CallContext } from "@/lib/llm/call";
import type { AdminClient } from "@/lib/supabase/admin";
import type { Notice } from "@/watch/notice";

const MAX_OUTPUT_TOKENS = 4000;

export type DraftResult =
  | { ok: true; draft: PlanDraft; model: string }
  | { ok: false; reason: string; skipped: boolean };

/**
 * FR-010 (spec 001), FR-010 (spec 002): 공고 하나의 요약·체크리스트 초안.
 * 어느 공급자든 공통 길(callLlm)로 부르고, 어떤 실패든 { ok: false }로 돌려 부르는 쪽이 기본 체크리스트를 쓰게 한다.
 * Q23 (spec 002): 공고 원문 값만 보낸다(buildPlanPrompt). 사용자 정보는 넣지 않는다.
 */
export async function draftPlan(db: AdminClient, notice: Notice, ctx: CallContext): Promise<DraftResult> {
  const result = await callLlm(db, {
    request: {
      purpose: "application_plan",
      system: PLAN_SYSTEM_PROMPT,
      prompt: buildPlanPrompt(notice),
      schema: PLAN_JSON_SCHEMA as unknown as Record<string, unknown>, // 읽기 전용 상수를 공통 모양(객체)으로 넘긴다
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
    parse: parsePlanDraft,
    ctx,
  });
  if (result.ok) return { ok: true, draft: result.data, model: `${result.provider}:${result.model ?? "?"}` };
  const skipped = "skipped" in result && result.skipped === true;
  const who = result.provider ? `${result.provider} ` : "";
  return { ok: false, reason: skipped ? result.message : `${who}${result.kind}: ${result.message}`, skipped };
}
