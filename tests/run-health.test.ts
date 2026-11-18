import { describe, expect, it } from "vitest";
import { consecutiveFailures } from "@/watch/run-health";

// spec 005 FR-001 (PRD FR-21): 출처별 최근 연속 실패 수. 시뮬레이터 실행은 세지 않는다
const run = (source_code: string, status: string, trigger = "scheduled") => ({ source_code, status, trigger });

describe("consecutiveFailures", () => {
  it("최근부터 성공이 나올 때까지 실패를 센다", () => {
    const runs = [run("a", "failed"), run("a", "failed"), run("a", "succeeded"), run("a", "failed")];
    expect(consecutiveFailures(runs, "a")).toBe(2);
  });
  it("가장 최근이 성공이면 0, 기록이 없어도 0", () => {
    expect(consecutiveFailures([run("a", "succeeded"), run("a", "failed")], "a")).toBe(0);
    expect(consecutiveFailures([], "a")).toBe(0);
  });
  it("다른 출처와 시뮬레이터·도는 중 실행은 건너뛴다", () => {
    const runs = [run("b", "failed"), run("a", "failed", "simulation"), run("a", "running"), run("a", "failed"), run("a", "succeeded")];
    expect(consecutiveFailures(runs, "a")).toBe(1);
  });
});
