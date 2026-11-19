import { describe, expect, it } from "vitest";
import { contractReminder, reminderStartDate } from "@/incident/contract-reminder";

// spec 013 FR-001·FR-003, 경계 E1~E5
describe("reminderStartDate (만료 2달 전, E5)", () => {
  it("같은 날짜로 두 달 앞", () => {
    expect(reminderStartDate("2027-05-31")).toBe("2027-03-31");
    expect(reminderStartDate("2027-03-15")).toBe("2027-01-15");
  });
  it("그 달에 같은 날이 없으면 그 달 마지막 날", () => {
    expect(reminderStartDate("2027-04-30")).toBe("2027-02-28");
    expect(reminderStartDate("2028-04-30")).toBe("2028-02-29");
    expect(reminderStartDate("2027-12-31")).toBe("2027-10-31");
  });
  it("해가 바뀌면 앞 해로", () => {
    expect(reminderStartDate("2027-01-10")).toBe("2026-11-10");
    expect(reminderStartDate("2027-02-28")).toBe("2026-12-28");
  });
  it("날짜 모양이 아니면 null", () => {
    expect(reminderStartDate("2027-13-01")).toBeNull();
    expect(reminderStartDate("내일")).toBeNull();
  });
});

describe("contractReminder (내 일정 표시)", () => {
  it("E1: 만료일이 없으면 null", () => {
    expect(contractReminder(null, "2026-11-19")).toBeNull();
  });
  it("E2: 2달 전 날짜 전날은 null, 당일부터 보인다", () => {
    expect(contractReminder("2027-01-19", "2026-11-18")).toBeNull();
    expect(contractReminder("2027-01-19", "2026-11-19")).toEqual({ state: "upcoming", endDate: "2027-01-19", daysLeft: 61, label: "계약 만료까지 61일" });
  });
  it("E3: 만료일 당일", () => {
    expect(contractReminder("2026-11-19", "2026-11-19")).toEqual({ state: "today", endDate: "2026-11-19", daysLeft: 0, label: "오늘 계약 만료" });
  });
  it("E4·FR-003: 만료일이 지나면 고칠 때까지 '지남'", () => {
    expect(contractReminder("2026-10-01", "2026-11-19")).toEqual({ state: "past", endDate: "2026-10-01", daysLeft: -49, label: "계약 만료일 지남" });
  });
  it("만료일이 날짜 모양이 아니면 null", () => {
    expect(contractReminder("2026-02-30", "2026-01-01")).toBeNull();
  });
});
