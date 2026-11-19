import { connection } from "next/server";
import { remainingToday, wikiGraph } from "@/chat/wiki-chat.server";
import { currentUserId } from "@/lib/supabase/server";
import { WikiChatForm } from "./wiki-chat-form";

export const metadata = { title: "위키 챗봇 | 관리자 | HomeFit AI" };

// IA AD_070700_TB 위키 챗봇 (PRD FR-26, spec 012 FR-009~016). 관리자 확인은 admin/layout.tsx Gate와 API가 둘 다 한다
export default async function AdminChatPage() {
  await connection();
  const userId = await currentUserId();
  // 남은 수를 못 읽어도 질문은 할 수 있다. 그때는 "하루 20번까지"를 보이고, 첫 답에서 남은 수를 받는다
  const initialRemaining = userId ? await remainingToday(userId, new Date()).catch(() => null) : null;
  // 그래프를 못 만들어도 질문은 된다. 그때는 그래프 자리에 안내 문구(FR-017)
  const graph = await wikiGraph().catch(() => null);
  return <WikiChatForm initialRemaining={initialRemaining} graph={graph} />;
}
