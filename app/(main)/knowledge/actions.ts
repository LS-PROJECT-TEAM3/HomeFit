"use server";

import { currentUserId } from "@/lib/supabase/server";
import { searchHistory, type HistoryAnswer } from "@/knowledge/history.server";

export type SearchState = { question: string; result: HistoryAnswer | null; error: string | null };

const MAX_QUESTION = 300;

// spec 005 FR-006 (PRD FR-18): 기록 찾기 서버 동작. 질문은 주소(URL)에 남기지 않는다
export async function searchHistoryAction(_prev: SearchState, form: FormData): Promise<SearchState> {
  const question = String(form.get("question") ?? "").trim();
  if (question.length === 0) return { question, result: null, error: "찾을 낱말이나 질문을 넣어 주세요. 예: 결로 알림에 뭐 했지?" };
  if (question.length > MAX_QUESTION) return { question, result: null, error: `질문은 ${MAX_QUESTION}자까지 넣을 수 있습니다.` };
  const userId = await currentUserId();
  if (!userId) return { question, result: null, error: "로그인이 끝났습니다. 다시 로그인해 주세요." };
  try {
    return { question, result: await searchHistory(userId, question), error: null };
  } catch {
    return { question, result: null, error: "처리 기록을 찾지 못했습니다. 잠시 뒤 다시 찾아 주세요." };
  }
}
