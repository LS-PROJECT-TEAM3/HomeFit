import { defineConfig } from "vitest/config";

// 순수 함수 시험만 돌린다(plan 001 §1). 화면 시험 도구는 아직 넣지 않는다.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
