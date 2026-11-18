import { describe, expect, it } from "vitest";
import { EVAL_CASES } from "@/eval/cases";
import { scoreCases, tally } from "@/eval/score";

// spec 005 FR-004 (PRD FR-25, CUJ-04 5단계): 정답 붙은 가짜 묶음을 감지 규칙에 넣어 맞힌·놓친·잘못 울린 수를 센다
describe("tally", () => {
  it("정답·예측으로 맞힌·놓친·잘못 울린·조용히 맞음을 센다", () => {
    const results = [
      { expected: true, predicted: true }, { expected: true, predicted: false },
      { expected: false, predicted: true }, { expected: false, predicted: false }, { expected: false, predicted: false },
    ];
    expect(tally(results)).toEqual({ total: 5, hit: 1, missed: 1, falseAlarm: 1, quietCorrect: 2 });
  });
});

describe("scoreCases", () => {
  it("정답 묶음에 공고 변화와 결로 위험이 둘 다 있고, 울려야 하는 것과 아닌 것이 모두 있다", () => {
    const kinds = new Set(EVAL_CASES.map((c) => c.kind));
    expect(kinds).toEqual(new Set(["notice", "humidity"]));
    expect(EVAL_CASES.some((c) => c.expected)).toBe(true);
    expect(EVAL_CASES.some((c) => !c.expected)).toBe(true);
    expect(new Set(EVAL_CASES.map((c) => c.id)).size).toBe(EVAL_CASES.length);
  });
  it("지금 규칙은 정답 묶음을 모두 맞힌다(바뀌면 이 시험이 알려 준다)", () => {
    const report = scoreCases(EVAL_CASES);
    const wrong = report.results.filter((r) => r.expected !== r.predicted).map((r) => r.id);
    expect(wrong).toEqual([]);
    expect(report.summary.missed + report.summary.falseAlarm).toBe(0);
  });
  it("종류별 합계도 낸다", () => {
    const report = scoreCases(EVAL_CASES);
    expect(report.byKind.notice.total + report.byKind.humidity.total).toBe(EVAL_CASES.length);
  });
});
