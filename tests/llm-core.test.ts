import { describe, expect, it } from "vitest";
import { createCallBudget } from "@/lib/llm/budget";
import { decideRetry } from "@/lib/llm/retry";
import { selectProvider } from "@/lib/llm/select";

// FR-005 (spec 002): 한도 초과만, 최대 2번, 대기 예산 안에서
describe("decideRetry", () => {
  const base = { retryAfterMs: null, attemptsSoFar: 1, remainingWaitMs: 10_000 };

  it("한도 초과만 다시 시도한다", () => {
    expect(decideRetry({ ...base, kind: "rate_limit" }).retry).toBe(true);
    for (const kind of ["auth", "timeout", "refused", "invalid_json", "invalid_shape", "server", "config", "unknown"] as const) {
      expect(decideRetry({ ...base, kind }).retry).toBe(false);
    }
  });

  it("최대 2번 다시 시도한다(시도 1·2번째 뒤 다시, 3번째 뒤 그만)", () => {
    expect(decideRetry({ ...base, kind: "rate_limit", attemptsSoFar: 1 }).retry).toBe(true);
    expect(decideRetry({ ...base, kind: "rate_limit", attemptsSoFar: 2 }).retry).toBe(true);
    expect(decideRetry({ ...base, kind: "rate_limit", attemptsSoFar: 3 }).retry).toBe(false);
  });

  it("서버가 알려 준 대기 시간을 따른다", () => {
    expect(decideRetry({ ...base, kind: "rate_limit", retryAfterMs: 7000 })).toEqual({ retry: true, waitMs: 7000 });
  });

  it("알려 준 대기가 남은 예산보다 길면 기다리지 않고 그만", () => {
    expect(decideRetry({ ...base, kind: "rate_limit", retryAfterMs: 60_000 }).retry).toBe(false);
  });

  it("알려 주지 않으면 1초, 다음엔 2초", () => {
    expect(decideRetry({ ...base, kind: "rate_limit", attemptsSoFar: 1 })).toEqual({ retry: true, waitMs: 1000 });
    expect(decideRetry({ ...base, kind: "rate_limit", attemptsSoFar: 2 })).toEqual({ retry: true, waitMs: 2000 });
  });
});

// FR-006 (spec 002)
describe("createCallBudget", () => {
  it("상한까지만 허락하고 넘은 수를 센다", () => {
    const budget = createCallBudget(20);
    const allowed = Array.from({ length: 25 }, () => budget.tryTake()).filter(Boolean).length;
    expect(allowed).toBe(20);
    expect(budget.skipped()).toBe(5);
  });
});

// FR-001 (spec 002)
describe("selectProvider", () => {
  it("값대로 고른다", () => {
    expect(selectProvider({ value: "gemini", isProduction: true })).toEqual({ ok: true, name: "gemini" });
    expect(selectProvider({ value: "claude", isProduction: false })).toEqual({ ok: true, name: "claude" });
    expect(selectProvider({ value: "mock", isProduction: true })).toEqual({ ok: true, name: "mock" });
  });

  it("대소문자와 앞뒤 빈칸은 무시한다", () => {
    expect(selectProvider({ value: " Gemini ", isProduction: false })).toEqual({ ok: true, name: "gemini" });
  });

  it("비었으면 개발·시험은 mock", () => {
    expect(selectProvider({ value: undefined, isProduction: false })).toEqual({ ok: true, name: "mock" });
    expect(selectProvider({ value: "", isProduction: false })).toEqual({ ok: true, name: "mock" });
  });

  it("비었으면 운영은 설정 없음", () => {
    expect(selectProvider({ value: undefined, isProduction: true })).toEqual({ ok: false, message: "AI 설정 없음" });
  });

  it("모르는 값은 실패", () => {
    expect(selectProvider({ value: "gpt", isProduction: false })).toEqual({ ok: false, message: "모르는 AI 공급자: gpt" });
  });
});
