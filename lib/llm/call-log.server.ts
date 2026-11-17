import type { CallRecord } from "@/lib/llm/call";
import type { AdminClient } from "@/lib/supabase/admin";

/** FR-004 (spec 002): ERD llm_calls 한 행 저장. 수집은 사용자 없이 돌아 secret 키로 쓴다 */
export async function saveCallRecord(db: AdminClient, record: CallRecord): Promise<void> {
  const { error } = await db.from("llm_calls").insert({
    run_id: record.runId,
    provider: record.provider,
    model: record.model,
    purpose: record.purpose,
    ok: record.ok,
    error_kind: record.errorKind,
    attempts: record.attempts,
    latency_ms: record.latencyMs,
    input_tokens: record.inputTokens,
    output_tokens: record.outputTokens,
  });
  if (error) throw new Error(`AI 호출 기록을 저장하지 못했습니다: ${error.message}`);
}
