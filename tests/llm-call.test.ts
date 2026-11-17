import { describe, expect, it } from "vitest";
import { createCallBudget } from "@/lib/llm/budget";
import { runLlmCall, type CallRecord } from "@/lib/llm/call";
import { createMockProvider } from "@/lib/llm/mock";
import type { LlmProvider, LlmRequest } from "@/lib/llm/types";

const request: LlmRequest = {
  purpose: "application_plan",
  system: "지시",
  prompt: "공고 값",
  schema: { type: "object", properties: { summary: { type: "string" } }, required: ["summary"] },
  maxOutputTokens: 1000,
};

function parseSummary(value: unknown): { summary: string } | null {
  return typeof value === "object" && value !== null && typeof (value as { summary?: unknown }).summary === "string"
    ? { summary: (value as { summary: string }).summary }
    : null;
}

function setup(provider: LlmProvider, options: { limit?: number; waitMs?: number; failLog?: boolean } = {}) {
  const records: CallRecord[] = [];
  const sleeps: number[] = [];
  let clock = 0;
  const deps = {
    sleep: async (ms: number) => { sleeps.push(ms); clock += ms; },
    now: () => clock,
    log: async (record: CallRecord) => {
      if (options.failLog) throw new Error("DB 오류");
      records.push(record);
    },
  };
  const ctx = { budget: createCallBudget(options.limit ?? 20), wait: { remainingMs: options.waitMs ?? 10_000 }, runId: "run-1" };
  return { records, sleeps, call: () => runLlmCall({ provider, request, parse: parseSummary, ctx, deps }) };
}

// FR-002~006 (spec 002): 공통 길
describe("runLlmCall", () => {
  it("성공하면 검사한 값과 공급자·모델을 돌려주고 한 번 기록한다", async () => {
    const { call, records } = setup(createMockProvider());
    const result = await call();
    expect(result).toMatchObject({ ok: true, data: { summary: "시험용 응답(mock)" }, provider: "mock", model: "fixed", attempts: 1 });
    expect(records).toEqual([
      expect.objectContaining({ runId: "run-1", provider: "mock", model: "fixed", purpose: "application_plan", ok: true, errorKind: null, attempts: 1 }),
    ]);
  });

  it("shape: JSON이 아니면 invalid_json", async () => {
    const { call } = setup(createMockProvider({ respond: () => "JSON 아님" }));
    expect(await call()).toMatchObject({ ok: false, kind: "invalid_json" });
  });

  it("shape: JSON이지만 칸이 없으면 invalid_shape", async () => {
    const { call } = setup(createMockProvider({ respond: () => ({ other: 1 }) }));
    expect(await call()).toMatchObject({ ok: false, kind: "invalid_shape" });
  });

  it("retry: 한도 초과 두 번 뒤 성공(시도 3, 1초·2초 기다림)", async () => {
    const { call, sleeps, records } = setup(createMockProvider({ failures: ["rate_limit", "rate_limit"] }));
    expect(await call()).toMatchObject({ ok: true, attempts: 3 });
    expect(sleeps).toEqual([1000, 2000]);
    expect(records[0]).toMatchObject({ attempts: 3, latencyMs: 3000 });
  });

  it("retry: 세 번 다 한도 초과면 실패, 시도 3", async () => {
    const { call, records } = setup(createMockProvider({ failures: ["rate_limit", "rate_limit", "rate_limit"] }));
    expect(await call()).toMatchObject({ ok: false, kind: "rate_limit", attempts: 3 });
    expect(records[0]).toMatchObject({ ok: false, errorKind: "rate_limit", attempts: 3 });
  });

  it("retry: 대기 예산이 모자라면 기다리지 않는다", async () => {
    const { call, sleeps } = setup(createMockProvider({ failures: ["rate_limit"] }), { waitMs: 500 });
    expect(await call()).toMatchObject({ ok: false, kind: "rate_limit", attempts: 1 });
    expect(sleeps).toEqual([]);
  });

  it("인증 실패는 다시 시도하지 않는다", async () => {
    const { call } = setup(createMockProvider({ failures: ["auth"] }));
    expect(await call()).toMatchObject({ ok: false, kind: "auth", attempts: 1 });
  });

  it("budget: 상한을 넘으면 부르지 않고 기록도 남기지 않는다", async () => {
    const { call, records } = setup(createMockProvider(), { limit: 1 });
    await call();
    expect(await call()).toMatchObject({ ok: false, skipped: true });
    expect(records).toHaveLength(1);
  });

  it("log: 기록이 실패해도 AI 결과는 그대로", async () => {
    const { call } = setup(createMockProvider(), { failLog: true });
    expect(await call()).toMatchObject({ ok: true, logFailed: true });
  });

  it("log: 기록에 보낸 글·받은 글이 없다", async () => {
    const { call, records } = setup(createMockProvider());
    await call();
    expect(JSON.stringify(records)).not.toContain("공고 값");
    expect(JSON.stringify(records)).not.toContain("시험용 응답");
  });
});
