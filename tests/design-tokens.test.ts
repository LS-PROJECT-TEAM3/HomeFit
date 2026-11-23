import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// CLAUDE.md "디자인" 절의 기준 색이 토큰 파일 한곳에 있는지 확인한다 (.claude/rules/design.md 1, spec 022)
const tokens = readFileSync("app/tokens.css", "utf-8").toLowerCase();

const requiredColors = [
  "#4e5b4e", // primary-normal
  "#2f3b2f", // primary-strong
  "#f6f4f2", // background-normal-normal
  "#ffffff", // background-elevated-normal
  "#ece9e4", // background-normal-alternative
  "#55463d", // label-normal, focus-ring
  "#554d47", // label-neutral
  "#675f59", // label-alternative
  "#e9e6e1", // line-normal-normal
  "#8a8e88", // line-solid-normal
  "#a12b2b", // status-negative
  "#8a5a12", // status-cautionary
];

describe("디자인 토큰", () => {
  it.each(requiredColors)("기준 색 %s 이 tokens.css에 있다", (color) => {
    expect(tokens).toContain(color);
  });

  it("한글 글꼴 Pretendard를 먼저 지정한다", () => {
    expect(tokens).toMatch(/--font-sans:\s*"pretendard variable"/);
  });

  it("제목은 Noto Serif KR, 로고는 Cormorant Garamond", () => {
    expect(tokens).toMatch(/--font-serif:\s*'noto serif kr'/);
    expect(tokens).toMatch(/--font-logo:[^;]*'cormorant garamond'/);
  });
});
