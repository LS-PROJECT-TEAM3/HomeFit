import Anthropic from "@anthropic-ai/sdk";
import { readClaudeError, readClaudeMessage } from "@/lib/llm/claude-response";
import { failure, type LlmProvider, type LlmRequest } from "@/lib/llm/types";

// spec 001 plan §1: 사용자 결정(2026-11-17)으로 Claude Haiku 5.5. 짧은 요약이라 effort low
export const DEFAULT_CLAUDE_MODEL = "claude-haiku-5-5";
const TIMEOUT_MS = 15_000;

type ClaudeMessageLike = Parameters<typeof readClaudeMessage>[0];
type CreateFn = (request: LlmRequest, model: string) => Promise<ClaudeMessageLike>;
type ClaudeOptions = { apiKey: string | undefined; model?: string; create?: CreateFn };

function sdkCreate(apiKey: string): CreateFn {
  const client = new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 0 }); // 다시 시도는 공통 길(retry.ts)이 한다
  return (request, model) =>
    client.messages.create({
      model,
      max_tokens: request.maxOutputTokens,
      system: request.system,
      messages: [{ role: "user", content: request.prompt }],
      output_config: { effort: "low", format: { type: "json_schema", schema: request.schema } },
    });
}

function retryAfterOf(error: { headers?: unknown }): string | null {
  const headers = error.headers;
  if (headers instanceof Headers) return headers.get("retry-after");
  if (typeof headers === "object" && headers !== null) {
    const value = (headers as Record<string, unknown>)["retry-after"];
    return typeof value === "string" ? value : null;
  }
  return null;
}

/** FR-001 (spec 002): Claude는 이미 쓰던 SDK로 부른다(새 라이브러리 없음) */
export function createClaudeProvider({ apiKey, model = DEFAULT_CLAUDE_MODEL, create }: ClaudeOptions): LlmProvider {
  let send: CreateFn | null = create ?? null;
  return {
    name: "claude",
    model,
    async send(request) {
      if (!apiKey) return failure("config", "ANTHROPIC_API_KEY 없음");
      send ??= sdkCreate(apiKey);
      try {
        return readClaudeMessage(await send(request, model));
      } catch (error) {
        if (error instanceof Anthropic.APIConnectionTimeoutError) return failure("timeout", "Claude 응답 시간 초과");
        const status = (error as { status?: unknown }).status;
        return readClaudeError(typeof status === "number" ? status : undefined, retryAfterOf(error as { headers?: unknown }));
      }
    },
  };
}
