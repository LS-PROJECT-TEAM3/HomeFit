import { describe, expect, it } from "vitest";
import { createMockProvider, sampleFromSchema } from "@/lib/llm/mock";
import type { LlmRequest } from "@/lib/llm/types";

const schema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    checklist: { type: "array", items: { type: "object", properties: { label: { type: "string" } }, required: ["label"] } },
  },
  required: ["summary", "checklist"],
};

const request: LlmRequest = { purpose: "application_plan", system: "지시", prompt: "공고 값", schema, maxOutputTokens: 1000 };

// FR-007 (spec 002): 네트워크 없이, 같은 요청에 같은 답
describe("sampleFromSchema", () => {
  it("스키마 모양대로 시험용 값을 만든다", () => {
    expect(sampleFromSchema(schema)).toEqual({
      summary: "시험용 응답(mock)",
      checklist: [{ label: "시험용 응답(mock)" }],
    });
  });

  it("숫자·참거짓", () => {
    expect(sampleFromSchema({ type: "object", properties: { n: { type: "integer" }, b: { type: "boolean" } } })).toEqual({ n: 0, b: false });
  });
});

describe("createMockProvider", () => {
  it("같은 요청에 같은 답, 공급자 이름 mock, 토큰은 글 길이로 어림", async () => {
    const mock = createMockProvider();
    const first = await mock.send(request);
    const second = await mock.send(request);
    expect(first).toEqual(second);
    expect(mock.name).toBe("mock");
    expect(first).toMatchObject({ ok: true, model: "fixed" });
    if (first.ok) {
      expect(JSON.parse(first.text)).toEqual(sampleFromSchema(schema));
      expect(first.usage.inputTokens).toBeGreaterThan(0);
    }
  });

  it("정한 실패를 차례로 흉내 낸 뒤 성공한다", async () => {
    const mock = createMockProvider({ failures: ["rate_limit", "invalid_json"] });
    expect(await mock.send(request)).toMatchObject({ ok: false, kind: "rate_limit" });
    expect(await mock.send(request)).toMatchObject({ ok: false, kind: "invalid_json" });
    expect(await mock.send(request)).toMatchObject({ ok: true });
  });

  it("답을 직접 정할 수 있다", async () => {
    const mock = createMockProvider({ respond: () => "JSON 아님" });
    expect(await mock.send(request)).toMatchObject({ ok: true, text: "JSON 아님" });
  });
});
