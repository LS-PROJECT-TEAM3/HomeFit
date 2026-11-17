import type { LlmErrorKind } from "@/lib/llm/types";

/** FR-005 (spec 002): 처음 1번 + 다시 2번 */
export const MAX_ATTEMPTS = 3;
const DEFAULT_WAITS_MS = [1000, 2000];

type RetryInput = {
  kind: LlmErrorKind;
  retryAfterMs: number | null;
  /** 지금까지 한 시도 수(처음이 1) */
  attemptsSoFar: number;
  /** 이번 수집에 남은 대기 예산 */
  remainingWaitMs: number;
};

export type RetryDecision = { retry: true; waitMs: number } | { retry: false };

/**
 * FR-005 (spec 002): 한도 초과만 다시 시도한다. 인증·시간 초과·거절은 다시 해도 같아서 바로 그만둔다.
 * 서버가 알려 준 대기가 남은 예산보다 길면 기다리지 않는다(수집이 시간 제한에 걸리지 않게).
 */
export function decideRetry({ kind, retryAfterMs, attemptsSoFar, remainingWaitMs }: RetryInput): RetryDecision {
  if (kind !== "rate_limit" || attemptsSoFar >= MAX_ATTEMPTS) return { retry: false };
  const waitMs = retryAfterMs ?? DEFAULT_WAITS_MS[attemptsSoFar - 1] ?? DEFAULT_WAITS_MS[DEFAULT_WAITS_MS.length - 1];
  if (waitMs > remainingWaitMs) return { retry: false };
  return { retry: true, waitMs };
}
