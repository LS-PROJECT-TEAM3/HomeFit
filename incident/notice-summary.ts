import type { Notice } from "@/watch/notice";

// FR-021 (spec 001 v0.5): 맞는 공고의 AI 요약. 순수 함수(부르기는 notice-summary.server.ts)

export const NOTICE_SUMMARY_SYSTEM_PROMPT = [
  "너는 독립을 준비하는 사회초년생에게 공공임대 모집 공고를 쉬운 한국어로 설명한다.",
  "주어진 공고 원문 값만 쓴다. 원문에 없는 자격 조건, 서류, 금액, 날짜는 지어내지 않는다.",
  "신청 자격이 되는지 판단하지 않는다. 자격은 공고문에서 확인하라고 안내한다.",
  "summary: 2~3문장. 무엇을 모집하는지, 어디인지, 언제까지 접수하는지, 임대료가 얼마부터인지.",
].join("\n");

export const NOTICE_SUMMARY_SCHEMA = {
  type: "object",
  properties: { summary: { type: "string" } },
  required: ["summary"],
  additionalProperties: false,
} as const;

const MAX_SUMMARY = 800;

function field(name: string, value: string | number | null): string {
  return `${name}: ${value === null || value === "" ? "공고문 확인" : value}`;
}

/** Q23 (spec 002): 공고 원문 값만 보낸다. 사용자 조건·이름은 넣지 않는다 */
export function buildNoticePrompt(notice: Notice): string {
  return [
    "다음 공고를 쉬운 말로 요약해 줘.",
    field("공고명", notice.title),
    field("공급 유형", notice.supplyType),
    field("공고일", notice.announcedOn),
    field("접수 시작일", notice.applyStart),
    field("접수 마감일", notice.applyEnd),
    field("월 임대료(가장 낮은 값)", notice.monthlyRent),
    field("공고 상태", notice.statusName),
  ].join("\n");
}

/** AI 답 검사. 비거나 모양이 다르거나 너무 길면 null(실패 → "요약을 만들지 못했습니다") */
export function parseNoticeSummary(raw: unknown): string | null {
  if (typeof raw !== "object" || raw === null || typeof (raw as { summary?: unknown }).summary !== "string") return null;
  const summary = (raw as { summary: string }).summary.trim();
  return summary === "" || summary.length > MAX_SUMMARY ? null : summary;
}
