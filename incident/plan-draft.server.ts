import Anthropic from "@anthropic-ai/sdk";
import {
  PLAN_JSON_SCHEMA,
  PLAN_SYSTEM_PROMPT,
  buildPlanPrompt,
  parsePlanDraft,
  type PlanDraft,
} from "@/incident/plan-draft";
import type { Notice } from "@/watch/notice";

// plan 001 §1: 사용자 결정(2026-11-17)으로 Claude Haiku 5.5. 짧은 요약이라 effort low
export const PLAN_MODEL = "claude-haiku-5-5";
const TIMEOUT_MS = 30_000;

export type DraftResult = { ok: true; draft: PlanDraft; model: string } | { ok: false; reason: string };

let client: Anthropic | null = null;
function anthropic(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 1 });
  return client;
}

function firstText(message: Anthropic.Message): string | null {
  for (const block of message.content) if (block.type === "text") return block.text;
  return null;
}

/**
 * FR-010 (spec 001): 공고 하나의 요약·체크리스트 초안. 어떤 실패든 { ok: false }로 돌려
 * 부르는 쪽이 기본 체크리스트를 쓰게 한다(화면은 원문 값과 승인·거절 버튼을 그대로 보임).
 */
export async function draftPlan(notice: Notice): Promise<DraftResult> {
  const api = anthropic();
  if (!api) return { ok: false, reason: "ANTHROPIC_API_KEY 없음" };
  try {
    const message = await api.messages.create({
      model: PLAN_MODEL,
      max_tokens: 4000,
      system: PLAN_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildPlanPrompt(notice) }],
      output_config: { effort: "low", format: { type: "json_schema", schema: PLAN_JSON_SCHEMA } },
    });
    // 안전 분류기 거절·길이 초과는 실패로 본다 (Haiku 5.5는 서버 대체 모델이 없음)
    if (message.stop_reason !== "end_turn") return { ok: false, reason: `stop_reason ${message.stop_reason}` };
    const text = firstText(message);
    const draft = text ? parsePlanDraft(JSON.parse(text)) : null;
    return draft ? { ok: true, draft, model: message.model } : { ok: false, reason: "응답 모양이 다름" };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return { ok: false, reason: "호출 한도 초과" };
    if (error instanceof Anthropic.APIError) return { ok: false, reason: `API 오류 ${error.status ?? ""}` };
    if (error instanceof SyntaxError) return { ok: false, reason: "JSON이 아님" };
    return { ok: false, reason: error instanceof Error ? error.message : "알 수 없는 오류" };
  }
}
