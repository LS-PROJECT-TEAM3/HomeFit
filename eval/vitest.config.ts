import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// spec 005 FR-004: `npm run eval` 전용. 새 실행 도구 없이 Vitest로 채점하고 eval/results.json을 쓴다
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("../", import.meta.url)) } },
  test: { environment: "node", include: ["eval/**/*.eval.ts"] },
});
