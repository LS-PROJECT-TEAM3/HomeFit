import { describe, expect, it } from "vitest";
import { dateRangeBounds, parseIncidentFilter, quickRange } from "@/incident/filter";

// FR-008 (spec 001): 사건 목록 거르기. 값은 주소(쿼리)에 남는다
// 사용자 요청(2026-11-23): 기간은 시작일~끝일 날짜 칸, 7일/30일 버튼은 날짜 칸을 채운다
describe("parseIncidentFilter", () => {
  it("값이 없으면 전체 상태, 전체 기간", () => {
    expect(parseIncidentFilter({})).toEqual({ status: "all", from: null, to: null });
  });

  it("아는 상태와 YYYY-MM-DD 날짜만 받는다", () => {
    expect(parseIncidentFilter({ status: "approved", from: "2026-11-01", to: "2026-11-23" })).toEqual({ status: "approved", from: "2026-11-01", to: "2026-11-23" });
  });

  it("모르는 값과 없는 날짜는 버린다", () => {
    expect(parseIncidentFilter({ status: "hacked", from: "2026-13-40", to: "어제" })).toEqual({ status: "all", from: null, to: null });
  });

  it("시작일이 끝일보다 늦으면 서로 바꾼다", () => {
    expect(parseIncidentFilter({ from: "2026-11-23", to: "2026-11-01" })).toEqual({ status: "all", from: "2026-11-01", to: "2026-11-23" });
  });

  it("같은 이름이 여러 번이면 첫 값", () => {
    expect(parseIncidentFilter({ status: ["pending", "new"] }).status).toBe("pending");
  });
});

describe("dateRangeBounds / quickRange", () => {
  it("한국 날짜 하루 전체를 포함한다(끝일 다음 날 0시 전까지)", () => {
    expect(dateRangeBounds("2026-11-16", "2026-11-23")).toEqual({ since: "2026-11-15T15:00:00.000Z", until: "2026-11-23T15:00:00.000Z" });
    expect(dateRangeBounds(null, null)).toEqual({ since: null, until: null });
  });

  it("7일은 오늘 포함 7일(6일 전~오늘)", () => {
    expect(quickRange(7, "2026-11-23")).toEqual({ from: "2026-11-17", to: "2026-11-23" });
    expect(quickRange(30, "2026-11-23")).toEqual({ from: "2026-10-25", to: "2026-11-23" });
  });
});
