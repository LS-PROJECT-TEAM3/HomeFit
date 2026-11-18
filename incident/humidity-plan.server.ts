import type { HumidityFacts } from "@/incident/humidity-detect";
import { buildHumidityPrompt, HUMIDITY_PLAN_SYSTEM_PROMPT } from "@/incident/humidity-plan";
import { PLAN_JSON_SCHEMA, parsePlanDraft } from "@/incident/plan-draft";
import type { DraftResult } from "@/incident/plan-draft.server";
import { callLlm } from "@/lib/llm/call.server";
import type { CallContext } from "@/lib/llm/call";
import type { AdminClient } from "@/lib/supabase/admin";

const MAX_OUTPUT_TOKENS = 4000;

/**
 * FR-007 (spec 003): 습도·결로 대응 계획 초안. 공고 계획(plan-draft.server.ts)과 같은 공통 길(callLlm)과 같은 JSON 모양을 쓴다.
 * 어떤 실패든 { ok: false }로 돌려 부르는 쪽이 기본 할 일을 쓰게 한다.
 */
export async function draftHumidityPlan(db: AdminClient, facts: HumidityFacts, ctx: CallContext): Promise<DraftResult> {
  const result = await callLlm(db, {
    request: {
      purpose: "response_plan",
      system: HUMIDITY_PLAN_SYSTEM_PROMPT,
      prompt: buildHumidityPrompt(facts),
      schema: PLAN_JSON_SCHEMA as unknown as Record<string, unknown>,
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
