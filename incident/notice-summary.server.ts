import { NOTICE_SUMMARY_SCHEMA, NOTICE_SUMMARY_SYSTEM_PROMPT, buildNoticePrompt, parseNoticeSummary } from "@/incident/notice-summary";
import { callLlm, newCallContext } from "@/lib/llm/call.server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Notice } from "@/watch/notice";

const SOURCE = "myhome_notice";

export type NoticeSummary = { summary: string; model: string; isMock: boolean };

/**
 * FR-021 (spec 001 v0.5): 저장된 공고 요약을 돌려주고, 없으면 AI로 한 번 만들어 저장한다.
 * 공고는 공개 자료라 요약을 모든 사용자가 같이 쓴다. 쓰기는 서버(secret 키)만(마이그레이션 0009).
 * 실패하면 null(화면은 "요약을 만들지 못했습니다"). 저장 실패는 요약을 그대로 보여 주고 다음에 다시 만든다.
 */
export async function getOrCreateNoticeSummary(announcementId: string, notice: Notice): Promise<NoticeSummary | null> {
  const db = createAdminClient();
  const saved = await db.from("notice_summaries").select("summary, model").eq("source_code", SOURCE).eq("announcement_id", announcementId).maybeSingle();
  if (saved.data) return { ...saved.data, isMock: saved.data.model.startsWith("mock:") };
  const result = await callLlm(db, {
    request: {
      purpose: "notice_summary",
      system: NOTICE_SUMMARY_SYSTEM_PROMPT,
      prompt: buildNoticePrompt(notice),
      schema: NOTICE_SUMMARY_SCHEMA as unknown as Record<string, unknown>, // 읽기 전용 상수를 공통 모양(객체)으로 넘긴다
      maxOutputTokens: 1000,
    },
    parse: parseNoticeSummary,
    ctx: newCallContext(null, 1),
  });
  if (!result.ok) return null;
  const model = `${result.provider}:${result.model ?? "?"}`;
  // 두 사람이 동시에 처음 열어도 한 줄만 남는다(먼저 들어간 요약을 둔다)
  await db.from("notice_summaries").upsert(
    { source_code: SOURCE, announcement_id: announcementId, summary: result.data, model },
    { onConflict: "source_code,announcement_id", ignoreDuplicates: true },
  );
  return { summary: result.data, model, isMock: result.provider === "mock" };
}
