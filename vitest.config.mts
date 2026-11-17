import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// 순수 함수 시험만 돌린다(plan 001 §1). 화면 시험 도구는 아직 넣지 않는다.
export default defineConfig({
  resolve: {
    // tsconfig의 "@/*" 경로와 같게 맞춘다
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
