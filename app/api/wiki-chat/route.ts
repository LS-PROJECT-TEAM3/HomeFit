import { connection } from "next/server";
import { checkQuestion } from "@/chat/wiki-answer";
import { answerWikiQuestion } from "@/chat/wiki-chat.server";
import { createClient, currentUserId } from "@/lib/supabase/server";

/**
 * spec 012 FR-009~014: 위키 챗봇 질문 받기. 관리자만(화면 Gate와 별도로 서버에서도 막음, PRD FR-19).
 * 키는 서버에만 있고(lib/llm) 오류 내용은 돌려주지 않는다 (PRD FR-27)
 */
export async function POST(request: Request) {
  await connection();
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { data: isAdmin, error: adminError } = await (await createClient()).rpc("is_admin");
  if (adminError) return Response.json({ error: "관리자인지 확인하지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  if (isAdmin !== true) return Response.json({ error: "관리자만 쓸 수 있습니다." }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { question?: unknown } | null;
  const checked = checkQuestion(body?.question);
  if (!checked.ok) return Response.json({ error: checked.message }, { status: 400 });
  try {
    const reply = await answerWikiQuestion(userId, checked.question, new Date());
    if (reply.kind === "limit") return Response.json({ error: "오늘 질문 한도를 다 썼습니다. 내일 다시 물어 주세요." }, { status: 429 });
    return Response.json(reply);
  } catch {
    return Response.json({ error: "답을 만들지 못했습니다. 잠시 뒤 다시 물어 주세요." }, { status: 502 });
  }
}
