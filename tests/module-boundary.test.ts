import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// FR-009 (spec 002): 계산·감지 모듈은 AI 모듈을, AI 모듈은 계산·감지 모듈을 불러오지 않는다
const CALC_AND_DETECT = [
  "incident/notice-change.ts",
  "incident/detect.ts",
  "incident/match.ts",
  "incident/checklist.ts",
  "incident/dedup.ts",
  "watch/myhome.ts",
];
const AI_MODULES = [
  "lib/llm/types.ts",
  "lib/llm/retry.ts",
  "lib/llm/budget.ts",
  "lib/llm/select.ts",
  "lib/llm/mock.ts",
  "lib/llm/gemini-response.ts",
  "lib/llm/claude-response.ts",
];

function imports(path: string): string[] {
  return [...readFileSync(path, "utf-8").matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
}

describe("모듈 경계", () => {
  it.each(CALC_AND_DETECT)("%s는 AI 모듈을 불러오지 않는다", (path) => {
    expect(imports(path).filter((name) => name.includes("lib/llm") || name.includes("anthropic") || name.includes("plan-draft"))).toEqual([]);
  });

  it.each(AI_MODULES)("%s는 사건 감지·계산·화면을 불러오지 않는다", (path) => {
    expect(imports(path).filter((name) => name.startsWith("@/incident") || name.startsWith("@/watch") || name.startsWith("@/app"))).toEqual([]);
  });
});
