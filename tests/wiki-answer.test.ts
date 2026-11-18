import { describe, expect, it } from "vitest";
import {
  WIKI_ANSWER_MAX, WIKI_DAILY_LIMIT, WIKI_NOT_FOUND, buildMockAnswer, buildWikiPrompt, canAskToday, checkQuestion, kstDayStart, parseWikiAnswer, readWikiReply,
} from "@/chat/wiki-answer";
import type { WikiChunk } from "@/chat/wiki-pages";

// spec 010 FR-010~012, FR-014, 경계·예외. plan 010 4단계 함수 시험
const chunks: WikiChunk[] = [
  { id: "W1", page: "규칙-사람 승인", heading: "내용", text: "관리자도 승인을 건너뛰지 못한다." },
  { id: "W2", page: "화면-메뉴와 화면 목록", heading: "충돌", text: "건축물 정보: IA 보류, PRD 1차." },
];

describe("buildWikiPrompt", () => {
  it("조각을 <자료> 태그로 감싸고 번호·쪽·절을 붙인다", () => {
    const prompt = buildWikiPrompt("승인 규칙은?", chunks);
    expect(prompt).toContain("<자료>");
    expect(prompt).toContain("</자료>");
    expect(prompt).toContain("[W1] 쪽: 규칙-사람 승인 · 절: 내용");
    expect(prompt.indexOf("질문: 승인 규칙은?")).toBeGreaterThan(prompt.indexOf("</자료>"));
  });
});

describe("parseWikiAnswer", () => {
  const allowed = new Set(["W1", "W2"]);

  it("준 번호만 남기고 답은 600자로 자른다", () => {
    const parsed = parseWikiAnswer({ answer: "가".repeat(900), sources: ["W1", "W9", "W1"] }, allowed);
    expect(parsed?.sourceIds).toEqual(["W1"]);
    expect(parsed?.answer).toHaveLength(WIKI_ANSWER_MAX);
  });

  it("쓴 출처가 없으면 위키에 없다고 답한다", () => {
    expect(parseWikiAnswer({ answer: "아마 3층입니다", sources: [] }, allowed)).toEqual({ answer: WIKI_NOT_FOUND, sourceIds: [] });
  });

  it("모양이 틀리거나 답이 비면 null", () => {
    expect(parseWikiAnswer({ text: "x" }, allowed)).toBeNull();
    expect(parseWikiAnswer({ answer: "  ", sources: ["W1"] }, allowed)).toBeNull();
    expect(parseWikiAnswer("문자열", allowed)).toBeNull();
  });
});

describe("buildMockAnswer", () => {
  it("모의 답이라고 밝히고 찾은 조각을 모두 출처로", () => {
    const mock = buildMockAnswer(chunks);
    expect(mock.answer).toContain("모의 답");
    expect(mock.sourceIds).toEqual(["W1", "W2"]);
  });
});

describe("checkQuestion", () => {
  it("앞뒤 공백을 지운 질문", () => {
    expect(checkQuestion("  승인 규칙은?  ")).toEqual({ ok: true, question: "승인 규칙은?" });
  });
  it("빈 질문은 거절", () => {
    expect(checkQuestion("   ")).toEqual({ ok: false, message: "질문을 입력해 주세요." });
    expect(checkQuestion(undefined)).toEqual({ ok: false, message: "질문을 입력해 주세요." });
  });
  it("300자를 넘으면 거절, 딱 300자는 통과", () => {
    expect(checkQuestion("가".repeat(300)).ok).toBe(true);
    expect(checkQuestion("가".repeat(301))).toEqual({ ok: false, message: "질문을 300자 이내로 줄여 주세요." });
  });
});

describe("하루 질문 한도", () => {
  it(`오늘 ${WIKI_DAILY_LIMIT - 1}번 물었으면 허용, ${WIKI_DAILY_LIMIT}번이면 막음`, () => {
    expect(canAskToday(WIKI_DAILY_LIMIT - 1)).toBe(true);
    expect(canAskToday(WIKI_DAILY_LIMIT)).toBe(false);
  });

  it("하루는 한국 날짜 자정부터(spec 010 Q4)", () => {
    // 2026-11-18T15:30Z = 한국 19일 00:30 → 하루 시작은 19일 00:00 KST = 18일 15:00Z
    expect(kstDayStart(new Date("2026-11-18T15:30:00Z")).toISOString()).toBe("2026-11-18T15:00:00.000Z");
    // 2026-11-18T14:59Z = 한국 18일 23:59 → 18일 00:00 KST = 17일 15:00Z
    expect(kstDayStart(new Date("2026-11-18T14:59:00Z")).toISOString()).toBe("2026-11-17T15:00:00.000Z");
  });
});

describe("readWikiReply (화면용 응답 읽기)", () => {
  const source = { id: "W1", page: "규칙-사람 승인", heading: "내용", text: "승인 전에는 실행하지 않는다." };

  it("성공 응답은 답·출처·mock 표시·남은 질문 수로 읽는다", () => {
    expect(readWikiReply(true, { kind: "answer", answer: "답 [W1]", sources: [source], isMock: true, remaining: 19 }))
      .toEqual({ ok: true, answer: "답 [W1]", sources: [source], isMock: true, remaining: 19 });
  });

  it("거절 응답은 서버 문구를 그대로 보인다(한도 초과 등)", () => {
    expect(readWikiReply(false, { error: "오늘 질문 한도를 다 썼습니다. 내일 다시 물어 주세요." }))
      .toEqual({ ok: false, message: "오늘 질문 한도를 다 썼습니다. 내일 다시 물어 주세요." });
  });

  it("모양이 틀리거나 본문이 없으면 기본 오류 문구", () => {
    expect(readWikiReply(true, { answer: 3 })).toEqual({ ok: false, message: "답을 만들지 못했습니다. 잠시 뒤 다시 물어 주세요." });
    expect(readWikiReply(false, null).ok).toBe(false);
  });
});
