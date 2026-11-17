import { describe, expect, it } from "vitest";
import { buildNoticePrompt, parseNoticeSummary } from "@/incident/notice-summary";
import { makeNotice } from "./fixtures";

// FR-021 (spec 001 v0.5): 공고 요약
describe("parseNoticeSummary", () => {
  it("summary 글을 꺼낸다", () => {
    expect(parseNoticeSummary({ summary: "  국민임대 예비입주자 모집입니다. " })).toBe("국민임대 예비입주자 모집입니다.");
  });

  it("비거나 모양이 다르거나 너무 길면 null", () => {
    expect(parseNoticeSummary({ summary: " " })).toBeNull();
    expect(parseNoticeSummary({ other: "x" })).toBeNull();
    expect(parseNoticeSummary({ summary: "가".repeat(801) })).toBeNull();
  });
});

describe("buildNoticePrompt", () => {
  it("공고 원문 값만 넣는다(사용자 정보 없음)", () => {
    const prompt = buildNoticePrompt(makeNotice());
    expect(prompt).toContain("가짜 행복주택 입주자 모집");
    expect(prompt).toContain("접수 마감일: 2026-11-22");
    expect(prompt).not.toMatch(/상한|나이|이메일/);
  });
});
