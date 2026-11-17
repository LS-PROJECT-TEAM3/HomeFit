import { connection } from "next/server";
import { answerChat } from "@/knowledge/chat.server";
import { currentUserId } from "@/lib/supabase/server";

const MAX_QUESTION = 300;

/**
 * spec 004 v0.3 FR-007: 챗봇 질문 받기. 로그인한 사람만, 자기 기록과 공공데이터로만 답한다.
 * 키는 서버에만 있고(lib/llm), 오류 내용은 돌려주지 않는다 (PRD FR-27)
 */
export async function POST(request: Request) {
  await connection();
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { question?: unknown } | null;
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (question === "" || question.length > MAX_QUESTION) {
    return Response.json({ error: `질문을 1~${MAX_QUESTION}자로 입력해 주세요.` }, { status: 400 });
  }
  try {
    return Response.json(await answerChat(userId, question, new Date()));
  } catch {
    return Response.json({ error: "답을 만들지 못했습니다. 잠시 뒤 다시 물어봐 주세요." }, { status: 502 });
  }
}
