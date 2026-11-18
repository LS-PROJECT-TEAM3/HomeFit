// FR-002 (spec 002): 어느 공급자든 같은 모양으로 요청하고 같은 모양으로 답을 받는다

/**
 * 지금 쓰는 공급자. 새 공급자(groq, openrouter 등)를 더하려면 (1) 여기 이름 하나 (2) providers/에 파일 하나
 * (3) registry.server.ts에 한 줄 (4) DB llm_calls.provider 허용 값(마이그레이션)을 더한다 (spec 002 SC-007)
 */
export const PROVIDER_NAMES = ["gemini", "claude", "mock"] as const;
export type ProviderName = (typeof PROVIDER_NAMES)[number];

/** ERD llm_calls.error_kind */
export type LlmErrorKind =
  | "config" // 설정 없음(키·공급자)
  | "auth" // 키가 틀림
  | "rate_limit" // 호출 한도 초과
  | "timeout"
  | "refused" // 안전 이유로 거절
  | "invalid_json"
  | "invalid_shape" // JSON이지만 원하는 칸이 없음
  | "server"
  | "unknown";

/** ERD llm_calls.purpose */
export type LlmPurpose = "application_plan" | "notice_summary" | "response_plan" | "chat_answer";

export type LlmRequest = {
  purpose: LlmPurpose;
  system: string;
  prompt: string;
  /** 원하는 JSON 모양(JSON Schema) */
  schema: Record<string, unknown>;
  maxOutputTokens: number;
};

export type LlmUsage = { inputTokens: number | null; outputTokens: number | null };

export type ProviderSuccess = { ok: true; text: string; model: string; usage: LlmUsage };
export type ProviderFailure = {
  ok: false;
  kind: LlmErrorKind;
  message: string;
  /** 서버가 알려 준 다시 시도 대기(밀리초) */
  retryAfterMs: number | null;
};
export type ProviderResult = ProviderSuccess | ProviderFailure;

export type LlmProvider = {
  name: ProviderName;
  /** 설정이 없어 모르면 null */
  model: string | null;
  send(request: LlmRequest): Promise<ProviderResult>;
};

export function failure(kind: LlmErrorKind, message: string, retryAfterMs: number | null = null): ProviderFailure {
  return { ok: false, kind, message, retryAfterMs };
}
