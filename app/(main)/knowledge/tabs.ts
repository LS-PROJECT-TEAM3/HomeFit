import type { BandTab } from "@/app/_components/section-band";

// 기획안 9절 AI Assistant = IA KN_050000_PG (PRD FR-18, spec 004 v0.2). 캔버스 v2-know-* 탭 3개
export const KNOWLEDGE_TABS: BandTab[] = [
  { href: "/knowledge", label: "기록 찾기" },
  { href: "/knowledge/history", label: "처리 기록" },
  { href: "/knowledge/sources", label: "공공데이터 출처" },
];
