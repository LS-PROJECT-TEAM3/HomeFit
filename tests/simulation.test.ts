import { describe, expect, it } from "vitest";
import { isSimulatedNotice, onlyVirtualWhenSimulating, parseVirtualUserIds } from "@/watch/simulation";

// 사용자 결정(2026-11-18): 시뮬레이션은 가상(시험) 계정에만. 실제 계정에는 가짜 공고·예보로 사건이 생기지 않는다
const people = [{ userId: "real-1" }, { userId: "virtual-1" }];

describe("onlyVirtualWhenSimulating", () => {
  it("정기·손으로 실행은 모두 그대로", () => {
    expect(onlyVirtualWhenSimulating(people, "scheduled", new Set(["virtual-1"]))).toEqual(people);
    expect(onlyVirtualWhenSimulating(people, "manual", new Set())).toEqual(people);
  });
  it("시뮬레이션은 가상 계정만", () => {
    expect(onlyVirtualWhenSimulating(people, "simulation", new Set(["virtual-1"]))).toEqual([{ userId: "virtual-1" }]);
  });
  it("가상 계정 목록이 비면 시뮬레이션은 아무에게도 안 감(실제 계정을 지키는 쪽)", () => {
    expect(onlyVirtualWhenSimulating(people, "simulation", new Set())).toEqual([]);
  });
});

describe("parseVirtualUserIds", () => {
  it("쉼표로 나눈 ID, 빈칸·빈 값은 버림", () => {
    expect([...parseVirtualUserIds(" a , b,, ")]).toEqual(["a", "b"]);
    expect(parseVirtualUserIds(undefined).size).toBe(0);
  });
});

describe("isSimulatedNotice", () => {
  it("가짜 공고(SIM-)를 알아본다", () => {
    expect(isSimulatedNotice("SIM-21581-3")).toBe(true);
    expect(isSimulatedNotice("21581-3")).toBe(false);
  });
});
