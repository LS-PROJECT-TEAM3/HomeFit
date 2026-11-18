import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { it } from "vitest";
import { EVAL_CASES } from "./cases";
import { scoreCases } from "./score";

// spec 005 FR-004 (PRD FR-25, SC-003): 채점 결과 파일. 화면(/admin/eval)과 같은 함수·같은 묶음이라 숫자가 같다
it("채점 결과를 eval/results.json에 쓴다", () => {
  const report = scoreCases(EVAL_CASES);
  const file = fileURLToPath(new URL("./results.json", import.meta.url));
  writeFileSync(file, `${JSON.stringify({ generatedAt: new Date().toISOString(), ...report }, null, 2)}\n`);
  const { hit, missed, falseAlarm, quietCorrect, total } = report.summary;
  console.log(`채점 ${total}건: 맞힘 ${hit}, 놓침 ${missed}, 잘못 울림 ${falseAlarm}, 조용히 맞음 ${quietCorrect} → ${file}`);
});
