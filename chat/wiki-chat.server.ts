import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  WIKI_JSON_SCHEMA, WIKI_MAX_CHUNKS, WIKI_NOT_FOUND, WIKI_SYSTEM_PROMPT, WIKI_DAILY_LIMIT,
  buildMockAnswer, buildWikiPrompt, canAskToday, kstDayStart, parseWikiAnswer, type WikiAnswer, type WikiSource,
} from "@/chat/wiki-answer";
import { chunkWiki, pickChunks, type WikiChunk, type WikiPageText } from "@/chat/wiki-pages";
import { buildWikiGraph, layoutWikiGraph, type WikiGraph } from "@/chat/wiki-graph";
import { callLlm, newCallContext } from "@/lib/llm/call.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// spec 012 FR-010·011·013·014: 위키 파일을 읽어 찾고, AI로 답하고, chat_logs에 남긴다.
// 위키 파일은 배포 묶음에 들어간 것을 바로 읽는다(spec 012 Q3, next.config.ts outputFileTracingIncludes)

export type WikiChatReply =
  | { kind: "answer"; answer: string; sources: WikiSource[]; isMock: boolean; remaining: number }
  | { kind: "limit" };

async function readWikiPages(): Promise<WikiPageText[]> {
  const dir = join(process.cwd(), "wiki");
  const names = (await readdir(dir)).filter((name) => name.endsWith(".md"));
  return Promise.all(names.map(async (name) => ({ page: name.replace(/\.md$/, ""), markdown: await readFile(join(dir, name), "utf8") })));
}

/** FR-017 위키 그래프: 챗봇과 같은 wiki/ 파일로 점·선과 자리를 만든다(AC1) */
export async function wikiGraph(): Promise<WikiGraph> {
  return layoutWikiGraph(buildWikiGraph(await readWikiPages()));
}

async function askedToday(userId: string, now: Date): Promise<number> {
  const { count, error } = await (await createClient())
    .from("chat_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", kstDayStart(now).toISOString());
  if (error) throw new Error("오늘 질문 수를 읽지 못했습니다.");
  return count ?? 0;
}

/** AI 실패는 던진다. 실패한 질문은 기록·한도에 세지 않는다(spec 012 Q5) */
async function answerFromChunks(question: string, picked: WikiChunk[]): Promise<WikiAnswer & { isMock: boolean }> {
  if (picked.length === 0) return { answer: WIKI_NOT_FOUND, sourceIds: [], isMock: false };
  const result = await callLlm(createAdminClient(), {
    request: { purpose: "wiki_answer", system: WIKI_SYSTEM_PROMPT, prompt: buildWikiPrompt(question, picked), schema: WIKI_JSON_SCHEMA as unknown as Record<string, unknown>, maxOutputTokens: 1000 },
    parse: (raw) => parseWikiAnswer(raw, new Set(picked.map((c) => c.id))),
    ctx: newCallContext(null),
  });
  if (!result.ok) throw new Error("답을 만들지 못했습니다.");
  if (result.provider === "mock") return { ...buildMockAnswer(picked), isMock: true };
  return { ...result.data, isMock: false };
}

/** 화면을 처음 열 때 보일 오늘 남은 질문 수 (PR #15 리뷰 8) */
export async function remainingToday(userId: string, now: Date): Promise<number> {
  return Math.max(0, WIKI_DAILY_LIMIT - (await askedToday(userId, now)));
}

// shortcut: 세기 → AI 부르기 → 넣기 순서라 같은 관리자가 동시에 여러 번 보내면 20번을 조금 넘을 수 있다. 관리자 전용이라 둔다. 사용자에게 열거나 비용이 커지면 DB 함수 하나로 세기·넣기를 묶는다(PR #15 리뷰 3)
export async function answerWikiQuestion(userId: string, question: string, now: Date): Promise<WikiChatReply> {
  const asked = await askedToday(userId, now);
  if (!canAskToday(asked)) return { kind: "limit" };
  const picked = pickChunks(question, chunkWiki(await readWikiPages()), WIKI_MAX_CHUNKS);
  const { answer, sourceIds, isMock } = await answerFromChunks(question, picked);
  const sources = picked.filter((c) => sourceIds.includes(c.id)).map(({ id, page, heading, text }) => ({ id, page, heading, text }));
  const { error } = await (await createClient()).from("chat_logs").insert({
    user_id: userId, question, answer, cited_pages: sources.map(({ page, heading }) => ({ page, heading })),
  });
  if (error) throw new Error("질문 기록을 저장하지 못했습니다.");
  return { kind: "answer", answer, sources, isMock, remaining: WIKI_DAILY_LIMIT - asked - 1 };
}
