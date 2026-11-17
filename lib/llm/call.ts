import type { CallBudget } from "@/lib/llm/budget";
import { decideRetry } from "@/lib/llm/retry";
import type { LlmErrorKind, LlmProvider, LlmPurpose, LlmRequest, LlmUsage, ProviderName, ProviderResult } from "@/lib/llm/types";

/** ERD llm_calls 한 행. 보낸 글·받은 글·키는 담지 않는다 (spec 002 FR-004, FR-008) */
export type CallRecord = {
  runId: string | null;
  provider: ProviderName;
  model: string | null;
  purpose: LlmPurpose;
  ok: boolean;
  errorKind: LlmErrorKind | null;
  attempts: number;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
};

/** 한 번 수집 동안 함께 쓰는 상한과 대기 예산 */
export type CallContext = { budget: CallBudget; wait: { remainingMs: number }; runId: string | null };

/** 시험에서 바꿔 끼우는 바깥 일 */
export type CallDeps = { sleep(ms: number): Promise<void>; now(): number; log(record: CallRecord): Promise<void> };

type Meta = { provider: ProviderName; model: string | null; attempts: number; latencyMs: number; logFailed?: boolean };
export type LlmCallResult<T> =
  | ({ ok: true; data: T } & Meta)
  | ({ ok: false; kind: LlmErrorKind; message: string; skipped?: boolean } & Meta);

type CallInput<T> = {
  provider: LlmProvider;
  request: LlmRequest;
  /** 원하는 모양이면 값, 아니면 null (FR-003) */
  parse: (value: unknown) => T | null;
  ctx: CallContext;
  deps: CallDeps;
};

type Outcome<T> = { ok: true; data: T; usage: LlmUsage } | { ok: false; kind: LlmErrorKind; message: string; usage: LlmUsage };

const NO_USAGE: LlmUsage = { inputTokens: null, outputTokens: null };

function checkShape<T>(result: ProviderResult, parse: (value: unknown) => T | null): Outcome<T> {
  if (!result.ok) return { ok: false, kind: result.kind, message: result.message, usage: NO_USAGE };
  let value: unknown;
  try {
    value = JSON.parse(result.text);
  } catch {
    return { ok: false, kind: "invalid_json", message: "답이 JSON이 아닙니다", usage: result.usage };
  }
  const data = parse(value);
  if (data === null) return { ok: false, kind: "invalid_shape", message: "답의 모양이 다릅니다", usage: result.usage };
  return { ok: true, data, usage: result.usage };
}

/** FR-005 (spec 002): 한도 초과면 판단 함수가 허락하는 만큼 기다렸다 다시 부른다 */
async function sendWithRetry(input: CallInput<unknown>): Promise<{ result: ProviderResult; attempts: number }> {
  const { provider, request, ctx, deps } = input;
  for (let attempts = 1; ; attempts += 1) {
    const result = await provider.send(request);
    if (result.ok) return { result, attempts };
    const decision = decideRetry({ kind: result.kind, retryAfterMs: result.retryAfterMs, attemptsSoFar: attempts, remainingWaitMs: ctx.wait.remainingMs });
    if (!decision.retry) return { result, attempts };
    ctx.wait.remainingMs -= decision.waitMs;
    await deps.sleep(decision.waitMs);
  }
}

/**
 * FR-002~006 (spec 002): AI 호출의 공통 길. 상한 확인 → 부르기·다시 시도 → JSON 모양 검사 → 호출 기록.
 * 어느 공급자든, 어떤 실패든 { ok: false }로 돌려 부르는 쪽이 기본값(예: 기본 체크리스트)을 쓰게 한다.
 */
export async function runLlmCall<T>(input: CallInput<T>): Promise<LlmCallResult<T>> {
  const { provider, request, parse, ctx, deps } = input;
  const base = { provider: provider.name, model: provider.model };
  if (!ctx.budget.tryTake()) {
    return { ok: false, kind: "rate_limit", message: "AI 상한으로 건너뜀", skipped: true, ...base, attempts: 0, latencyMs: 0 };
  }
  const startedAt = deps.now();
  const { result, attempts } = await sendWithRetry(input as CallInput<unknown>);
  const outcome = checkShape(result, parse);
  const model = result.ok ? result.model : provider.model;
  const latencyMs = Math.max(0, Math.round(deps.now() - startedAt));
  const record: CallRecord = {
    runId: ctx.runId, provider: provider.name, model, purpose: request.purpose,
    ok: outcome.ok, errorKind: outcome.ok ? null : outcome.kind, attempts, latencyMs,
    inputTokens: outcome.usage.inputTokens, outputTokens: outcome.usage.outputTokens,
  };
  // 호출 기록이 실패해도 AI 결과는 쓴다(spec 002 경계). 부르는 쪽이 실행 기록에 남긴다
  const logFailed = await deps.log(record).then(() => undefined, () => true);
  const meta = { provider: provider.name, model, attempts, latencyMs, ...(logFailed ? { logFailed } : {}) };
  return outcome.ok ? { ok: true, data: outcome.data, ...meta } : { ok: false, kind: outcome.kind, message: outcome.message, ...meta };
}
