import { DEFAULT_CALLS_PER_RUN, createCallBudget } from "@/lib/llm/budget";
import { runLlmCall, type CallContext, type LlmCallResult } from "@/lib/llm/call";
import { saveCallRecord } from "@/lib/llm/call-log.server";
import { resolveProvider } from "@/lib/llm/registry.server";
import type { LlmRequest } from "@/lib/llm/types";
import type { AdminClient } from "@/lib/supabase/admin";

/** FR-005 (spec 002): 한 번 수집에서 다시 시도로 기다리는 시간 합계 */
export const WAIT_BUDGET_MS = 10_000;

/** 한 번 수집 동안 함께 쓰는 상한·대기 예산 (FR-005, FR-006) */
export function newCallContext(runId: string | null, limit = DEFAULT_CALLS_PER_RUN): CallContext {
  return { budget: createCallBudget(limit), wait: { remainingMs: WAIT_BUDGET_MS }, runId };
}

export type ConfigFailure = { ok: false; kind: "config"; message: string; provider: null; model: null; attempts: 0; latencyMs: 0 };

/**
 * spec 002 FR-001~006: 기능 코드가 부르는 입구. 공급자를 고르고 공통 길로 부른다.
 * AI_PROVIDER가 비었거나(운영) 모르는 값이면 부르지 않고 config 실패를 돌려준다(공급자가 없어 호출 기록도 없음).
 */
export async function callLlm<T>(
  db: AdminClient,
  args: { request: LlmRequest; parse: (value: unknown) => T | null; ctx: CallContext },
): Promise<LlmCallResult<T> | ConfigFailure> {
  const choice = resolveProvider();
  if (!choice.ok) return { ok: false, kind: "config", message: choice.message, provider: null, model: null, attempts: 0, latencyMs: 0 };
  return runLlmCall({
    provider: choice.provider,
    ...args,
    deps: {
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      now: () => performance.now(),
      log: (record) => saveCallRecord(db, record),
    },
  });
}
