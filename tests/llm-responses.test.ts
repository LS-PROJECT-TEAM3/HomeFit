import { describe, expect, it } from "vitest";
import { readClaudeError, readClaudeMessage } from "@/lib/llm/claude-response";
import { readGeminiError, readGeminiSuccess } from "@/lib/llm/gemini-response";

const MODEL = "gemini-3.5-flash-lite";

// FR-002, FR-003 (spec 002): Gemini 답 → 공통 모양
describe("readGeminiSuccess", () => {
  it("글과 토큰을 꺼낸다", () => {
    const body = {
      candidates: [{ content: { parts: [{ text: '{"a":' }, { text: "1}" }] }, finishReason: "STOP" }],
      usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 40, totalTokenCount: 160 },
    };
    expect(readGeminiSuccess(body, MODEL)).toEqual({ ok: true, text: '{"a":1}', model: MODEL, usage: { inputTokens: 120, outputTokens: 40 } });
  });

  it("토큰을 알려 주지 않으면 비운다(실패 아님)", () => {
    const body = { candidates: [{ content: { parts: [{ text: "{}" }] }, finishReason: "STOP" }] };
    expect(readGeminiSuccess(body, MODEL)).toMatchObject({ ok: true, usage: { inputTokens: null, outputTokens: null } });
  });

  it("안전 이유로 막히면 거절", () => {
    const body = { candidates: [{ finishReason: "SAFETY" }] };
    expect(readGeminiSuccess(body, MODEL)).toMatchObject({ ok: false, kind: "refused" });
    expect(readGeminiSuccess({ promptFeedback: { blockReason: "SAFETY" } }, MODEL)).toMatchObject({ ok: false, kind: "refused" });
  });

  it("길이가 모자라 끊기면 JSON 아님", () => {
    const body = { candidates: [{ content: { parts: [{ text: '{"a' }] }, finishReason: "MAX_TOKENS" }] };
    expect(readGeminiSuccess(body, MODEL)).toMatchObject({ ok: false, kind: "invalid_json" });
  });

  it("답이 비면 알 수 없음", () => {
    expect(readGeminiSuccess({}, MODEL)).toMatchObject({ ok: false, kind: "unknown" });
  });
});

describe("readGeminiError", () => {
  it("429 RESOURCE_EXHAUSTED는 한도 초과, retryDelay를 읽는다", () => {
    const body = {
      error: {
        code: 429, status: "RESOURCE_EXHAUSTED", message: "quota",
        details: [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "7s" }],
      },
    };
    expect(readGeminiError(429, body)).toMatchObject({ ok: false, kind: "rate_limit", retryAfterMs: 7000 });
  });

  it("retryDelay가 없으면 대기도 비운다", () => {
    expect(readGeminiError(429, { error: { status: "RESOURCE_EXHAUSTED" } })).toMatchObject({ kind: "rate_limit", retryAfterMs: null });
  });

  it("키 오류는 인증", () => {
    expect(readGeminiError(400, { error: { status: "INVALID_ARGUMENT", details: [{ reason: "API_KEY_INVALID" }] } })).toMatchObject({ kind: "auth" });
    expect(readGeminiError(403, { error: { status: "PERMISSION_DENIED" } })).toMatchObject({ kind: "auth" });
  });

  it("서버 오류와 시간 초과", () => {
    expect(readGeminiError(500, {})).toMatchObject({ kind: "server" });
    expect(readGeminiError(503, {})).toMatchObject({ kind: "server" });
    expect(readGeminiError(504, {})).toMatchObject({ kind: "timeout" });
  });

  it("그 밖의 400은 알 수 없음", () => {
    expect(readGeminiError(400, { error: { status: "INVALID_ARGUMENT", message: "bad" } })).toMatchObject({ kind: "unknown" });
  });
});

// FR-002 (spec 002): Claude 답 → 공통 모양
describe("readClaudeMessage", () => {
  const usage = { input_tokens: 90, output_tokens: 30 };

  it("end_turn이면 글과 토큰", () => {
    const message = { model: "claude-haiku-5-5", stop_reason: "end_turn", content: [{ type: "text", text: "{}" }], usage };
    expect(readClaudeMessage(message)).toEqual({ ok: true, text: "{}", model: "claude-haiku-5-5", usage: { inputTokens: 90, outputTokens: 30 } });
  });

  it("refusal은 거절, max_tokens는 JSON 아님", () => {
    expect(readClaudeMessage({ model: "m", stop_reason: "refusal", content: [], usage })).toMatchObject({ ok: false, kind: "refused" });
    expect(readClaudeMessage({ model: "m", stop_reason: "max_tokens", content: [], usage })).toMatchObject({ ok: false, kind: "invalid_json" });
  });

  it("글이 없으면 알 수 없음", () => {
    expect(readClaudeMessage({ model: "m", stop_reason: "end_turn", content: [], usage })).toMatchObject({ ok: false, kind: "unknown" });
  });
});

describe("readClaudeError", () => {
  it("429는 한도 초과, retry-after(초)를 읽는다", () => {
    expect(readClaudeError(429, "12")).toMatchObject({ kind: "rate_limit", retryAfterMs: 12_000 });
  });

  it("401·403은 인증, 529·500은 서버, 408은 시간 초과, 상태 없음은 서버(연결)", () => {
    expect(readClaudeError(401, null)).toMatchObject({ kind: "auth" });
    expect(readClaudeError(403, null)).toMatchObject({ kind: "auth" });
    expect(readClaudeError(529, null)).toMatchObject({ kind: "server" });
    expect(readClaudeError(500, null)).toMatchObject({ kind: "server" });
    expect(readClaudeError(408, null)).toMatchObject({ kind: "timeout" });
    expect(readClaudeError(undefined, null)).toMatchObject({ kind: "server" });
  });
});
