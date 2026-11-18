import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { WIKI_MAX_CHUNKS } from "@/chat/wiki-answer";
import { chunkWiki, pickChunks } from "@/chat/wiki-pages";

// spec 009 FR-015, SC-008: 정답표(docs/wiki-chat.md 1절, 사용자 확정 2026-11-18) 5문항으로 실제 wiki/ 찾기를 확인한다.
// 정답표와 이 목록은 결과를 보고 고치지 않는다. 틀리면 찾기(chat/wiki-pages.ts)를 고친다(plan 009 6단계 랄프 루프)
const ANSWER_KEY = [
  { id: "Q1", kind: "있음", question: "관리자도 사건을 대신 승인할 수 있어?", pages: ["규칙-사람 승인"] },
  { id: "Q2", kind: "있음", question: "결로 사건은 실내 습도가 몇 % 이상일 때 생겨?", pages: ["규칙-사건 기준", "기능-003 습도·결로 사건"] },
  { id: "Q3", kind: "있음", question: "슬랙 알림에는 어떤 내용이 들어가?", pages: ["규칙-알림과 슬랙"] },
  { id: "Q4", kind: "없음", question: "대표님 점심 메뉴는?", pages: [] },
  { id: "Q5", kind: "충돌", question: "건축물 정보 조회는 1차 범위야?", pages: ["화면-메뉴와 화면 목록"] },
] as const;

const wikiDir = join(process.cwd(), "wiki");
const chunks = chunkWiki(
  readdirSync(wikiDir).filter((name) => name.endsWith(".md")).map((name) => ({ page: name.replace(/\.md$/, ""), markdown: readFileSync(join(wikiDir, name), "utf8") })),
);

describe("위키 챗봇 정답표 찾기 시험 (실제 wiki/)", () => {
  for (const item of ANSWER_KEY.filter((q) => q.kind !== "없음")) {
    it(`${item.id} ${item.kind}: "${item.question}" → 정답 쪽이 찾은 조각 ${WIKI_MAX_CHUNKS}개 안에 있다`, () => {
      const found = pickChunks(item.question, chunks, WIKI_MAX_CHUNKS).map((c) => c.page);
      expect(found.some((page) => (item.pages as readonly string[]).includes(page)), `찾은 쪽: ${found.join(", ")}`).toBe(true);
    });
  }

  it('Q4 없음: "대표님 점심 메뉴는?" → 찾은 조각 0개(AI를 부르지 않고 "위키에 없습니다", FR-011 기준 2)', () => {
    const found = pickChunks(ANSWER_KEY[3].question, chunks, WIKI_MAX_CHUNKS).map((c) => `${c.page}·${c.heading}`);
    expect(found, `찾은 조각: ${found.join(", ")}`).toEqual([]);
  });

  it("Q5 충돌: 정답 쪽의 충돌 절 조각을 찾는다(두 출처를 함께 보여 줄 근거, FR-010 기준 2)", () => {
    const found = pickChunks(ANSWER_KEY[4].question, chunks, WIKI_MAX_CHUNKS);
    expect(found.some((c) => c.page === "화면-메뉴와 화면 목록" && c.heading === "충돌")).toBe(true);
  });
});
