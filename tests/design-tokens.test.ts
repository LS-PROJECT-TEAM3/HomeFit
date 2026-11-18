import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// CLAUDE.md "디자인" 절의 기준 색이 토큰 파일 한곳에 있는지 확인한다 (.claude/rules/design.md 1)
const tokens = readFileSync("app/tokens.css", "utf-8").toLowerCase();

const requiredColors = [
  "#2563eb",
  "#3b82f6",
  "#ea580c",
  "#f8fafc",
  "#ffffff",
  "#1e293b",
  "#e9eff8",
  "#475569",
  "#e2e8f0",
  "#dc2626",
];

describe("디자인 토큰", () => {
  it.each(requiredColors)("기준 색 %s 이 tokens.css에 있다", (color) => {
    expect(tokens).toContain(color);
  });

  it("한글 글꼴 Pretendard를 먼저 지정한다", () => {
    expect(tokens).toMatch(/--font-sans:\s*"pretendard variable"/);
  });
});
