import { describe, expect, it } from "vitest";
import { parseIncidentFilter, periodStart } from "@/incident/filter";

// FR-008 (spec 001): 사건 목록 거르기. 값은 주소(쿼리)에 남는다
describe("parseIncidentFilter", () => {
  it("값이 없으면 전체 상태, 전체 기간", () => {
    expect(parseIncidentFilter({})).toEqual({ status: "all", period: "all" });
  });

  it("아는 값만 받는다", () => {
    expect(parseIncidentFilter({ status: "approved", period: "30d" })).toEqual({ status: "approved", period: "30d" });
  });

  it("모르는 값은 기본값으로", () => {
    expect(parseIncidentFilter({ status: "hacked", period: "9999d" })).toEqual({ status: "all", period: "all" });
  });

  it("같은 이름이 여러 번이면 첫 값", () => {
    expect(parseIncidentFilter({ status: ["pending", "new"] }).status).toBe("pending");
  });
});

describe("periodStart", () => {
  const now = new Date("2026-11-17T03:00:00Z");
  it("7일", () => {
    expect(periodStart("7d", now)).toBe("2026-11-10T03:00:00.000Z");
  });
  it("전체 기간은 null", () => {
    expect(periodStart("all", now)).toBeNull();
  });
});
