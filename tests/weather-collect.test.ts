import { describe, expect, it } from "vitest";
import { collectForecasts } from "@/watch/weather-collect";
import { buildWeatherFixture } from "@/watch/weather-fixtures";

// FR-003 (spec 003) + 3단계 리뷰 1: 시군구마다 한 번 부르고, 실패한 곳만 건너뛴다
const NOW = new Date("2026-11-18T06:00:00+09:00");

describe("collectForecasts", () => {
  it("같은 시군구는 한 번만 부른다", async () => {
    const calls: string[] = [];
    const result = await collectForecasts(["26350", "26350", "41390"], async (grid) => {
      calls.push(`${grid.nx},${grid.ny}`);
      return buildWeatherFixture("safe", NOW);
    }, NOW);
    expect(calls).toHaveLength(2);
    expect([...result.bySigungu.keys()]).toEqual(["26350", "41390"]);
    expect(result.failed).toEqual([]);
  });

  it("한 곳이 실패하면 그곳만 건너뛰고 이유를 남긴다", async () => {
    const result = await collectForecasts(["26350", "41390"], async (grid) => {
      if (grid.ny === 75) return buildWeatherFixture("failure", NOW); // 부산 해운대구 격자 99,75
      return buildWeatherFixture("safe", NOW);
    }, NOW);
    expect([...result.bySigungu.keys()]).toEqual(["41390"]);
    expect(result.failed).toEqual([{ sigunguCode: "26350", reason: "기상청 응답 오류 03: NO_DATA" }]);
  });

  it("모든 곳이 실패하면 회차 전체를 수집 오류로 던진다", async () => {
    await expect(collectForecasts(["26350", "41390"], async () => {
      throw new Error("기상청 응답 HTTP 500");
    }, NOW)).rejects.toThrow(/2곳 모두 실패: 기상청 응답 HTTP 500/);
  });

  it("격자를 모르는 시군구는 부르지 않고 센다", async () => {
    const result = await collectForecasts(["99110", "26350"], async () => buildWeatherFixture("safe", NOW), NOW);
    expect(result.unknown).toBe(1);
    expect(result.bySigungu.size).toBe(1);
  });
});
