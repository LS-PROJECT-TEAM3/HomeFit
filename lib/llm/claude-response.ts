import { failure, type ProviderFailure, type ProviderResult } from "@/lib/llm/types";

// FR-002 (spec 002): Claude Messages 답 → 공통 모양. SDK 타입에 기대지 않아 순수 함수로 시험한다

type ClaudeMessageLike = {
  model: string;
  stop_reason: string | null;
  content: ReadonlyArray<{ type: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

export function readClaudeMessage(message: ClaudeMessageLike): ProviderResult {
  if (message.stop_reason === "refusal") return failure("refused", "Claude가 답을 거절했습니다");
  if (message.stop_reason === "max_tokens") return failure("invalid_json", "답이 길이 제한에서 끊겼습니다");
  if (message.stop_reason !== "end_turn") return failure("unknown", `stop_reason ${message.stop_reason}`);
  const text = message.content.find((block) => block.type === "text")?.text ?? "";
  if (text === "") return failure("unknown", "Claude 답에 글이 없습니다");
  return {
    ok: true,
    text,
    model: message.model,
    usage: { inputTokens: message.usage?.input_tokens ?? null, outputTokens: message.usage?.output_tokens ?? null },
  };
}

/** status가 없으면 연결 실패. retryAfter는 retry-after 헤더(초) */
export function readClaudeError(status: number | undefined, retryAfter: string | null): ProviderFailure {
  if (status === 429) {
    const seconds = retryAfter === null ? Number.NaN : Number.parseFloat(retryAfter);
    return failure("rate_limit", "Claude 호출 한도 초과", Number.isFinite(seconds) ? Math.round(seconds * 1000) : null);
  }
  if (status === 401 || status === 403) return failure("auth", "Claude 키가 맞지 않거나 권한이 없습니다");
  if (status === 408) return failure("timeout", "Claude 응답 시간 초과");
  if (status === undefined) return failure("server", "Claude에 연결하지 못했습니다");
  if (status >= 500) return failure("server", `Claude 서버 오류 ${status}`);
  return failure("unknown", `Claude 오류 ${status}`);
}
