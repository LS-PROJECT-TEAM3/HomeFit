import { failure, type LlmErrorKind, type LlmProvider, type LlmRequest } from "@/lib/llm/types";

// FR-007 (spec 002): 네트워크를 쓰지 않는 공급자. 자동 시험·Ralph Loop·AI_PROVIDER가 빈 개발 환경에서 쓴다

const SAMPLE_TEXT = "시험용 응답(mock)";

type Schema = { type?: unknown; properties?: unknown; items?: unknown };

/** JSON Schema 모양대로 늘 같은 시험용 값을 만든다 */
export function sampleFromSchema(schema: unknown): unknown {
  const node = (typeof schema === "object" && schema !== null ? schema : {}) as Schema;
  switch (node.type) {
    case "string":
      return SAMPLE_TEXT;
    case "number":
    case "integer":
      return 0;
    case "boolean":
      return false;
    case "array":
      return [sampleFromSchema(node.items)];
    case "object": {
      const properties = (typeof node.properties === "object" && node.properties !== null ? node.properties : {}) as Record<string, unknown>;
      return Object.fromEntries(Object.entries(properties).map(([key, value]) => [key, sampleFromSchema(value)]));
    }
    default:
      return null;
  }
}

function roughTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

type MockOptions = {
  /** 차례대로 흉내 낼 실패. 다 쓰면 성공 */
  failures?: LlmErrorKind[];
  /** 답을 직접 정함. 문자열이면 그대로, 아니면 JSON으로 */
  respond?: (request: LlmRequest) => unknown;
};

export function createMockProvider({ failures = [], respond }: MockOptions = {}): LlmProvider {
  const queue = [...failures];
  return {
    name: "mock",
    model: "fixed",
    async send(request) {
      const kind = queue.shift();
      if (kind) return failure(kind, `mock이 흉내 낸 실패: ${kind}`);
      const value = respond ? respond(request) : sampleFromSchema(request.schema);
      const text = typeof value === "string" ? value : JSON.stringify(value);
      return {
        ok: true,
        text,
        model: "fixed",
        usage: { inputTokens: roughTokens(request.system + request.prompt), outputTokens: roughTokens(text) },
      };
    },
  };
}
