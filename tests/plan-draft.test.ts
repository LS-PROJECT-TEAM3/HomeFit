import { describe, expect, it } from "vitest";
import { buildPlanPrompt, composeChecklist, parsePlanDraft } from "@/incident/plan-draft";
import { makeNotice } from "./fixtures";

// FR-010 (spec 001): AI 초안을 검사하고, 마감일은 원문 값으로 붙인다
describe("parsePlanDraft", () => {
  const ok = { summary: "서울 행복주택 입주자를 모집합니다. 11월 22일까지 신청할 수 있습니다.", checklist: [{ label: "공고문에서 자격 확인하기" }, { label: "소득 서류 준비하기" }] };

  it("모양이 맞으면 요약과 항목을 꺼낸다", () => {
    expect(parsePlanDraft(ok)).toEqual({ summary: ok.summary, labels: ["공고문에서 자격 확인하기", "소득 서류 준비하기"] });
  });

  it("요약이 비면 실패(null)", () => {
    expect(parsePlanDraft({ ...ok, summary: "  " })).toBeNull();
  });

  it("항목이 하나도 없으면 실패", () => {
    expect(parsePlanDraft({ ...ok, checklist: [] })).toBeNull();
  });

  it("모양이 다르면 실패", () => {
    expect(parsePlanDraft("요약입니다")).toBeNull();
    expect(parsePlanDraft({ summary: "a", checklist: [{ text: "x" }] })).toBeNull();
  });

  it("너무 긴 요약은 실패", () => {
    expect(parsePlanDraft({ ...ok, summary: "가".repeat(801) })).toBeNull();
  });

  it("항목은 앞뒤 공백을 지우고 빈 항목은 뺀다. 10개까지만", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ label: ` 항목 ${i} ` }));
    const parsed = parsePlanDraft({ ...ok, checklist: [{ label: " " }, ...many] });
    expect(parsed?.labels).toHaveLength(10);
    expect(parsed?.labels[0]).toBe("항목 0");
  });
});

describe("composeChecklist", () => {
  it("AI 항목 뒤에 원문 마감일 항목을 붙인다", () => {
    const items = composeChecklist(["공고문에서 자격 확인하기", "서류 준비"], makeNotice({ applyEnd: "2026-11-22" }));
    expect(items.at(-1)).toEqual({ label: "신청 마감(2026-11-22) 전에 신청하기", dueOn: "2026-11-22" });
    expect(items.slice(0, 2).every((item) => item.dueOn === null)).toBe(true);
  });

  it("AI 항목에 공고문 확인이 없으면 맨 앞에 넣는다(자격은 판정하지 않음)", () => {
    const items = composeChecklist(["서류 준비"], makeNotice());
    expect(items[0].label).toBe("공고문에서 신청 자격 확인하기");
  });
});

describe("buildPlanPrompt", () => {
  it("원문 값을 모두 넣고, 없는 값은 '공고문 확인'으로 쓴다", () => {
    const prompt = buildPlanPrompt(makeNotice({ monthlyRent: null }));
    expect(prompt).toContain("가짜 행복주택 입주자 모집");
    expect(prompt).toContain("2026-11-22");
    expect(prompt).toContain("월 임대료: 공고문 확인");
  });
});
