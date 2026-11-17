import { createMockProvider } from "@/lib/llm/mock";
import { createClaudeProvider } from "@/lib/llm/providers/claude.server";
import { createGeminiProvider } from "@/lib/llm/providers/gemini.server";
import { selectProvider } from "@/lib/llm/select";
import type { LlmProvider, ProviderName } from "@/lib/llm/types";

type Env = Record<string, string | undefined>;

/**
 * FR-001 (spec 002): AI_PROVIDER → 공급자. 새 공급자(groq, openrouter 등)는 types.ts의 이름과 여기 한 줄을 더한다(SC-007).
 * "운영"은 Vercel 운영 배포다. 미리보기 배포와 로컬은 개발로 본다.
 */
const FACTORIES: Record<ProviderName, (env: Env) => LlmProvider> = {
  gemini: (env) => createGeminiProvider({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL }),
  claude: (env) => createClaudeProvider({ apiKey: env.ANTHROPIC_API_KEY }),
  mock: () => createMockProvider(),
};

export type ProviderChoice = { ok: true; provider: LlmProvider } | { ok: false; message: string };

export function resolveProvider(env: Env = process.env): ProviderChoice {
  const selection = selectProvider({ value: env.AI_PROVIDER, isProduction: env.VERCEL_ENV === "production" });
  return selection.ok ? { ok: true, provider: FACTORIES[selection.name](env) } : selection;
}
