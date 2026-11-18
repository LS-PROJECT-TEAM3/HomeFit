import { HOUSING_LABELS } from "@/incident/home-form";
import { PLAN_JSON_SCHEMA, parsePlanDraft } from "@/incident/plan-draft";
import type { DraftResult } from "@/incident/plan-draft.server";
import type { RentFacts } from "@/incident/rent-detect";
import { buildRentPrompt, RENT_PLAN_SYSTEM_PROMPT } from "@/incident/rent-plan";
import { callLlm } from "@/lib/llm/call.server";
import type { CallContext } from "@/lib/llm/call";
import type { AdminClient } from "@/lib/supabase/admin";

const MAX_OUTPUT_TOKENS = 4000;

/** spec 008 FR-006: 시세 대응 계획 초안. 습도 계획과 같은 공통 길(callLlm)·같은 JSON 모양. 실패는 { ok: false } */
export async function draftRentPlan(db: AdminClient, facts: RentFacts, ctx: CallContext): Promise<DraftResult> {
  const result = await callLlm(db, {
    request: {
      purpose: "response_plan", system: RENT_PLAN_SYSTEM_PROMPT,
      prompt: buildRentPrompt({ ...facts, housingLabel: HOUSING_LABELS[facts.housingType] }),
      schema: PLAN_JSON_SCHEMA as unknown as Record<string, unknown>, maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
    parse: parsePlanDraft,
    ctx,
  });
  if (result.ok) return { ok: true, draft: result.data, model: `${result.provider}:${result.model ?? "?"}` };
  const skipped = "skipped" in result && result.skipped === true;
  const who = result.provider ? `${result.provider} ` : "";
  return { ok: false, reason: skipped ? result.message : `${who}${result.kind}: ${result.message}`, skipped };
}
