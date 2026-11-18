import { WikiChatForm } from "./wiki-chat-form";

export const metadata = { title: "위키 챗봇 | 관리자 | HomeFit AI" };

// IA AD_070700_TB 위키 챗봇 (PRD FR-26, spec 012 FR-009~016). 관리자 확인은 admin/layout.tsx Gate와 API가 둘 다 한다
export default function AdminChatPage() {
  return <WikiChatForm />;
}
