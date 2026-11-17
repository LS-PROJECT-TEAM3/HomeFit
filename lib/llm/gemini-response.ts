import { failure, type ProviderFailure, type ProviderResult } from "@/lib/llm/types";

// FR-002 (spec 002): Gemini generateContent 답 → 공통 모양
// 칸 이름은 공식 문서(2026-11-17)대로. plan 002 4단계에서 실제 키로 다시 확인한다

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function count(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

const REFUSED_REASONS = new Set(["SAFETY", "RECITATION", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "IMAGE_SAFETY"]);

export function readGeminiSuccess(body: unknown, model: string): ProviderResult {
  if (!isRecord(body)) return failure("unknown", "Gemini 답의 모양이 다릅니다");
  const blocked = isRecord(body.promptFeedback) ? body.promptFeedback.blockReason : undefined;
  if (typeof blocked === "string") return failure("refused", `요청이 막혔습니다: ${blocked}`);
  const candidate = Array.isArray(body.candidates) && isRecord(body.candidates[0]) ? body.candidates[0] : null;
  if (!candidate) return failure("unknown", "Gemini 답이 비었습니다");
  const reason = typeof candidate.finishReason === "string" ? candidate.finishReason : "";
  if (REFUSED_REASONS.has(reason)) return failure("refused", `답이 막혔습니다: ${reason}`);
  if (reason === "MAX_TOKENS") return failure("invalid_json", "답이 길이 제한에서 끊겼습니다");
  const parts = isRecord(candidate.content) && Array.isArray(candidate.content.parts) ? candidate.content.parts : [];
  const text = parts.map((part) => (isRecord(part) && typeof part.text === "string" ? part.text : "")).join("");
  if (text === "") return failure("unknown", "Gemini 답에 글이 없습니다");
  const usage = isRecord(body.usageMetadata) ? body.usageMetadata : {};
  return {
    ok: true,
    text,
    model,
    usage: { inputTokens: count(usage.promptTokenCount), outputTokens: count(usage.candidatesTokenCount) },
  };
}

/** google.rpc.RetryInfo의 retryDelay("7s", "7.5s") → 밀리초 */
function retryDelayMs(error: Json): number | null {
  const details = Array.isArray(error.details) ? error.details : [];
  for (const detail of details) {
    if (!isRecord(detail) || typeof detail.retryDelay !== "string") continue;
    const seconds = Number.parseFloat(detail.retryDelay);
    if (Number.isFinite(seconds)) return Math.round(seconds * 1000);
  }
  return null;
}

function mentionsKey(error: Json): boolean {
  const details = Array.isArray(error.details) ? error.details : [];
  return details.some((detail) => isRecord(detail) && typeof detail.reason === "string" && detail.reason.startsWith("API_KEY"));
}

export function readGeminiError(status: number, body: unknown): ProviderFailure {
  const error = isRecord(body) && isRecord(body.error) ? body.error : {};
  const message = typeof error.message === "string" ? error.message : `HTTP ${status}`;
  if (status === 429 || error.status === "RESOURCE_EXHAUSTED") return failure("rate_limit", "Gemini 호출 한도 초과", retryDelayMs(error));
  if (status === 401 || status === 403 || mentionsKey(error)) return failure("auth", "Gemini 키가 맞지 않거나 권한이 없습니다");
  if (status === 408 || status === 504) return failure("timeout", "Gemini 응답 시간 초과");
  if (status >= 500) return failure("server", `Gemini 서버 오류 ${status}`);
  return failure("unknown", `Gemini 오류 ${status}: ${message}`);
}
