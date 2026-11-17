import { readGeminiError, readGeminiSuccess } from "@/lib/llm/gemini-response";
import { failure, type LlmProvider, type LlmRequest } from "@/lib/llm/types";

// plan 002 §1: 공식 문서(2026-11-17) 기준 안정판 중 가장 싸고 빠른 모델. GEMINI_MODEL로 바꾼다
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 15_000;

type GeminiOptions = { apiKey: string | undefined; model?: string; fetchFn?: typeof fetch; timeoutMs?: number };

function body(request: LlmRequest) {
  return {
    systemInstruction: { parts: [{ text: request.system }] },
    contents: [{ role: "user", parts: [{ text: request.prompt }] }],
    // FR-003 (spec 002): JSON 모양을 알려 준다. 칸 이름은 plan 002 4단계에서 실제 키로 확정
    generationConfig: {
      responseMimeType: "application/json",
      responseJsonSchema: request.schema,
      maxOutputTokens: request.maxOutputTokens,
    },
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

/** FR-001 (spec 002): Gemini API generateContent를 fetch로 부른다. 키는 헤더로만 보낸다(주소에 넣지 않음) */
export function createGeminiProvider({ apiKey, model, fetchFn = fetch, timeoutMs = TIMEOUT_MS }: GeminiOptions): LlmProvider {
  const modelName = model?.trim() || DEFAULT_GEMINI_MODEL;
  return {
    name: "gemini",
    model: modelName,
    async send(request) {
      if (!apiKey) return failure("config", "GEMINI_API_KEY 없음");
      try {
        const response = await fetchFn(`${ENDPOINT}/${modelName}:generateContent`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify(body(request)),
          signal: AbortSignal.timeout(timeoutMs),
        });
        const json = await readJson(response);
        return response.ok ? readGeminiSuccess(json, modelName) : readGeminiError(response.status, json);
      } catch (error) {
        // 오류 글은 키를 담지 않는 우리 문장으로만 돌려준다 (FR-008)
        return isTimeout(error) ? failure("timeout", "Gemini 응답 시간 초과") : failure("server", "Gemini에 연결하지 못했습니다");
      }
    },
  };
}
