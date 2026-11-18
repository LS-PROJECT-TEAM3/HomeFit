import { describe, expect, it } from "vitest";
import { kepcoQueryMonths, kepcoRegion, parseHouseholdAverage } from "@/watch/kepco-household";
import { KEPCO_HOUSE_SAMPLE, KEPCO_HOUSE_EMPTY, KEPCO_HOUSE_BAD } from "@/watch/fixtures/kepco-house";

// spec 011 FR-001, E2. 응답 형식은 전력데이터개방포털 「가구평균 전력사용량 API 가이드」(2026-11-18 확인)
describe("kepcoRegion (법정동 시군구 코드 5자리 → 시도·시군구)", () => {
  it("11680 → 11, 680", () => {
    expect(kepcoRegion("11680")).toEqual({ metroCd: "11", cityCd: "680" });
  });
  it("5자리 숫자가 아니면 null", () => {
    for (const bad of ["", "1168", "116800", "11a80"]) expect(kepcoRegion(bad)).toBeNull();
  });
});

describe("kepcoQueryMonths (전전월부터, 한국 시각)", () => {
  it("2026-11-18 → 2026-09, 2026-08", () => {
    expect(kepcoQueryMonths(new Date("2026-11-18T03:00:00Z"))).toEqual([
      { year: "2026", month: "09" }, { year: "2026", month: "08" },
    ]);
  });
  it("해를 넘긴다: 2027-01-31 23시(한국 2월 1일) → 2026-12, 2026-11", () => {
    expect(kepcoQueryMonths(new Date("2027-01-31T16:00:00Z"))).toEqual([
      { year: "2026", month: "12" }, { year: "2026", month: "11" },
    ]);
  });
});

describe("parseHouseholdAverage", () => {
  it("첫 행의 평균 사용량·가구 수·기준 달을 읽는다", () => {
    expect(parseHouseholdAverage(KEPCO_HOUSE_SAMPLE)).toEqual({ kwh: 231.08, households: 140446, year: "2026", month: "09" });
  });
  it("설명서의 다른 칸 이름(powerUseage)도 읽는다", () => {
    const row = { year: "2026", month: "09", houseCnt: 10, powerUseage: 199.4, bill: 1 };
    expect(parseHouseholdAverage({ data: [row] })?.kwh).toBe(199.4);
  });
  it("E2: 빈 목록·모양이 다름·0 이하는 null", () => {
    expect(parseHouseholdAverage(KEPCO_HOUSE_EMPTY)).toBeNull();
    expect(parseHouseholdAverage(KEPCO_HOUSE_BAD)).toBeNull();
    expect(parseHouseholdAverage(null)).toBeNull();
    expect(parseHouseholdAverage({ data: [{ year: "2026", month: "09", houseCnt: 1, powerUsage: 0 }] })).toBeNull();
  });
});
