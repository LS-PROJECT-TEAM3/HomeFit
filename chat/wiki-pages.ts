// spec 012 FR-010·FR-011: 위키 쪽을 절 단위 조각으로 자르고, 질문 낱말이 많이 겹치는 조각을 고른다. 순수 함수
// 임베딩은 쓰지 않는다(spec 012 제외 범위, Q3). 수업 교안 P2-S08a처럼 낱말 겹침으로 찾는다

export type WikiChunk = { id: string; page: string; heading: string; text: string };
export type WikiPageText = { page: string; markdown: string };

// 목차·작업 기록·연결지도·위키 규칙 파일은 근거 조각으로 쓰지 않는다(plan 012 파일별 역할)
export const SKIPPED_PAGES = new Set(["index", "log", "연결지도", "CLAUDE"]);
const SUMMARY_HEADING = "요약";

function stripFrontMatter(markdown: string): string {
  return markdown.replace(/^---\n[\s\S]*?\n---\n/, "");
}

/** 쪽 하나를 "## 절" 단위 조각으로. 제목 아래 한 줄 요약은 "요약" 조각이 된다 */
export function splitWikiPage(page: string, markdown: string): WikiChunk[] {
  const body = stripFrontMatter(markdown.replace(/\r\n/g, "\n"));
  const [head, ...sections] = body.split(/\n## /);
  const summary = head.split("\n").filter((line) => line.startsWith(">")).map((line) => line.replace(/^>\s?/, "")).join("\n");
  const parts = [
    { heading: SUMMARY_HEADING, text: summary },
    ...sections.map((section) => {
      const [heading, ...lines] = section.split("\n");
      return { heading: heading.trim(), text: lines.join("\n").trim() };
    }),
  ];
  return parts.filter((part) => part.text !== "").map((part) => ({ id: `${page}#${part.heading}`, page, ...part }));
}

export function chunkWiki(pages: readonly WikiPageText[]): WikiChunk[] {
  return pages.filter((p) => !SKIPPED_PAGES.has(p.page)).flatMap((p) => splitWikiPage(p.page, p.markdown));
}

/** 질문 낱말. 두 글자 이상만. 낱말마다 찾을 꼴 목록: 세 글자 이상이면 끝의 조사 한 글자를 뗀 꼴도(예: "규칙은" → "규칙") */
function questionWords(question: string): string[][] {
  const words = [...new Set(question.toLowerCase().split(/[^0-9a-z가-힣]+/).filter((word) => word.length >= 2))];
  return words.map((word) => (word.length >= 3 ? [word, word.slice(0, -1)] : [word]));
}

/**
 * 질문 낱말을 많이 덮는 조각부터 limit개. 고른 조각에는 W1, W2… 번호를 다시 붙인다.
 * 질문 낱말이 2개 이상 겹치는 조각만 쓴다(질문 낱말이 하나면 그 하나). 낱말 하나만 우연히 겹친 조각으로 답을 지어내지 않게(FR-011)
 * 쪽 이름·절 제목에 든 낱말은 한 번 더 센다. 제목이 질문과 딱 맞는 쪽이 긴 본문에 밀리지 않게(PR #15 리뷰, 정답표 Q6)
 */
export function pickChunks(question: string, chunks: readonly WikiChunk[], limit: number): WikiChunk[] {
  const words = questionWords(question);
  if (words.length === 0) return [];
  const minScore = Math.min(2, words.length);
  const hits = (text: string) => words.filter((forms) => forms.some((form) => text.includes(form))).length;
  return chunks
    .map((chunk, order) => {
      const title = `${chunk.page} ${chunk.heading}`.toLowerCase();
      const matched = hits(`${title} ${chunk.text.toLowerCase()}`);
      return { chunk, order, matched, score: matched + hits(title) };
    })
    .filter((item) => item.matched >= minScore)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, limit)
    .map((item, i) => ({ ...item.chunk, id: `W${i + 1}` }));
}
