import { describe, expect, it } from "vitest";
import { createClaudeProvider } from "@/lib/llm/providers/claude.server";
import { createGeminiProvider } from "@/lib/llm/providers/gemini.server";
import type { LlmRequest } from "@/lib/llm/types";

const request: LlmRequest = {
  purpose: "application_plan",
  system: "지시",
  prompt: "공고 값",
  schema: { type: "object", properties: { summary: { type: "string" } }, required: ["summary"] },
  maxOutputTokens: 500,
};

type Captured = { url: string; init: RequestInit };

function fakeFetch(status: number, body: unknown, captured: Captured[] = []): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    captured.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
}

// FR-001~003, FR-008 (spec 002): Gemini는 fetch로, 가짜 fetch로 시험한다
describe("createGeminiProvider", () => {
  it("키가 없으면 부르지 않고 config 실패", async () => {
    const captured: Captured[] = [];
    const gemini = createGeminiProvider({ apiKey: undefined, model: "m", fetchFn: fakeFetch(200, {}, captured) });
    expect(await gemini.send(request)).toMatchObject({ ok: false, kind: "config" });
    expect(captured).toHaveLength(0);
  });

  it("키는 헤더로만 보내고, JSON 모양을 요청에 담는다", async () => {
    const captured: Captured[] = [];
    const body = { candidates: [{ content: { parts: [{ text: '{"summary":"요약"}' }] }, finishReason: "STOP" }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 } };
    const gemini = createGeminiProvider({ apiKey: "FAKE-GEMINI-KEY", model: "gemini-3.5-flash-lite", fetchFn: fakeFetch(200, body, captured) });
    const result = await gemini.send(request);
    expect(result).toEqual({ ok: true, text: '{"summary":"요약"}', model: "gemini-3.5-flash-lite", usage: { inputTokens: 10, outputTokens: 5 } });
    const [{ url, init }] = captured;
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent");
    expect(url).not.toContain("FAKE-GEMINI-KEY");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("FAKE-GEMINI-KEY");
    const sent = JSON.parse(String(init.body));
    expect(sent.generationConfig).toMatchObject({ responseMimeType: "application/json", responseJsonSchema: request.schema, maxOutputTokens: 500 });
    expect(sent.systemInstruction.parts[0].text).toBe("지시");
  });

  it("429는 한도 초과", async () => {
    const gemini = createGeminiProvider({ apiKey: "k", model: "m", fetchFn: fakeFetch(429, { error: { status: "RESOURCE_EXHAUSTED" } }) });
    expect(await gemini.send(request)).toMatchObject({ ok: false, kind: "rate_limit" });
  });

  it("연결이 끊기거나 시간이 지나면 timeout, 오류 글에 키가 없다", async () => {
    const throwing = (async () => { throw new DOMException("The operation timed out.", "TimeoutError"); }) as typeof fetch;
    const gemini = createGeminiProvider({ apiKey: "FAKE-GEMINI-KEY", model: "m", fetchFn: throwing });
    const result = await gemini.send(request);
    expect(result).toMatchObject({ ok: false, kind: "timeout" });
    expect(JSON.stringify(result)).not.toContain("FAKE-GEMINI-KEY");
  });
});

// Claude는 SDK 호출 함수를 바꿔 끼워 시험한다
describe("createClaudeProvider", () => {
  it("키가 없으면 config 실패", async () => {
    const claude = createClaudeProvider({ apiKey: undefined });
    expect(await claude.send(request)).toMatchObject({ ok: false, kind: "config" });
  });

  it("SDK 답을 공통 모양으로", async () => {
    const claude = createClaudeProvider({
      apiKey: "k",
      create: async () => ({ model: "claude-haiku-5-5", stop_reason: "end_turn", content: [{ type: "text", text: "{}" }], usage: { input_tokens: 3, output_tokens: 2 } }),
    });
    expect(await claude.send(request)).toEqual({ ok: true, text: "{}", model: "claude-haiku-5-5", usage: { inputTokens: 3, outputTokens: 2 } });
  });

  it("SDK 오류(상태 코드)를 실패 종류로", async () => {
    const claude = createClaudeProvider({
      apiKey: "k",
      create: async () => { throw Object.assign(new Error("rate"), { status: 429, headers: new Headers({ "retry-after": "3" }) }); },
    });
    expect(await claude.send(request)).toMatchObject({ ok: false, kind: "rate_limit", retryAfterMs: 3000 });
  });
});
