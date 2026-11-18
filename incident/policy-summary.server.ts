import { POLICY_SUMMARY_SCHEMA, POLICY_SUMMARY_SYSTEM_PROMPT, buildPolicyPrompt, parsePolicySummary } from "@/incident/policy-summary";
import { callLlm, newCallContext } from "@/lib/llm/call.server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Policy } from "@/watch/youth-policy";

const SOURCE = "youth_policy";

export type PolicySummary = { summary: string; model: string; isMock: boolean };

/**
 * spec 006 v0.3 FR-007: 저장된 정책 요약을 돌려주고, 없으면 AI로 한 번 만들어 저장한다.
 * 공고 요약과 같은 표(notice_summaries, 출처 칸 youth_policy)를 쓴다. 정책은 공개 자료라 모두가 같이 쓴다.
 * 실패하면 null(화면은 원문 값만).
 */
export async function getOrCreatePolicySummary(policy: Policy): Promise<PolicySummary | null> {
  const db = createAdminClient();
  const saved = await db.from("notice_summaries").select("summary, model").eq("source_code", SOURCE).eq("announcement_id", policy.externalId).maybeSingle();
  if (saved.data) return { ...saved.data, isMock: saved.data.model.startsWith("mock:") };
  const result = await callLlm(db, {
    request: {
      purpose: "notice_summary", system: POLICY_SUMMARY_SYSTEM_PROMPT, prompt: buildPolicyPrompt(policy),
      schema: POLICY_SUMMARY_SCHEMA as unknown as Record<string, unknown>, maxOutputTokens: 1000,
    },
    parse: parsePolicySummary,
    ctx: newCallContext(null, 1),
  });
  if (!result.ok) return null;
  const model = `${result.provider}:${result.model ?? "?"}`;
  await db.from("notice_summaries").upsert(
    { source_code: SOURCE, announcement_id: policy.externalId, summary: result.data, model },
    { onConflict: "source_code,announcement_id", ignoreDuplicates: true },
  );
  return { summary: result.data, model, isMock: result.provider === "mock" };
}
