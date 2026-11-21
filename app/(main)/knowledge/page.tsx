import { HistorySearch } from "./history-search";

export const metadata = { title: "기록 찾기 | AI 도우미 | HomeFit AI" };

// IA KN_050000_PG 기록 찾기 (PRD FR-18, spec 005 FR-006, spec 022 FR-011 캔버스 v2-know-poster-pc): 승인·거절로 끝난 알림에서 찾고, 찾은 기록만 근거로 답한다
export default function KnowledgeAskPage() {
  return <HistorySearch />;
}
