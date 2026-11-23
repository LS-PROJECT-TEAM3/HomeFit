import { describe, expect, it } from "vitest";
import { monthGrid, readMonth, scheduleEvents, shiftMonth, upcoming } from "@/incident/schedule-calendar";

// spec 022(캔버스 v2-s7-pc): 내 일정 달력(일요일 시작 6주까지)과 다가오는 일정
describe("monthGrid", () => {
  it("2026년 12월은 11.29(일)부터 1.2(토)까지 5주", () => {
    const weeks = monthGrid("2026-12");
    expect(weeks).toHaveLength(5);
    expect(weeks[0][0]).toBe("2026-11-29");
    expect(weeks[4][6]).toBe("2027-01-02");
  });
});

describe("readMonth·shiftMonth", () => {
  it("주소 값이 틀리면 오늘 달, 앞뒤 달 이동", () => {
    expect(readMonth("2026-03", "2026-11-22")).toBe("2026-03");
    expect(readMonth("2026-13", "2026-11-22")).toBe("2026-11");
    expect(readMonth(undefined, "2026-11-22")).toBe("2026-11");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
});

describe("scheduleEvents·upcoming", () => {
  const items = [
    { id: "a", title: "청년 매입임대 2차", kind: "prepare" as const, checklist: [{ label: "접수하기", dueOn: "2026-12-15", done: false }, { label: "등본", dueOn: "2026-12-05", done: true }, { label: "날짜 없음", dueOn: null, done: false }] },
    { id: "b", title: "결로", kind: "risk" as const, checklist: [{ label: "환기", dueOn: "2026-11-20", done: false }] },
  ];
  it("날짜 있는 할 일만, 날짜 순", () => {
    expect(scheduleEvents(items).map((e) => [e.date, e.label, e.index])).toEqual([["2026-11-20", "환기", 0], ["2026-12-05", "등본", 1], ["2026-12-15", "접수하기", 0]]);
  });
  it("다가오는 일정은 오늘부터, 끝내지 않은 것만", () => {
    expect(upcoming(scheduleEvents(items), "2026-11-22", 5).map((e) => e.label)).toEqual(["접수하기"]);
  });
});
