import { describe, expect, it } from "vitest";
import { planSteps } from "@/incident/plan-steps";

// spec 022(캔버스 v2-s6-pc): 알림 상세 "일정 N개가 내 일정에 들어가요" 줄. 날짜·요일, 공고 마감일과 같은 날은 마감 표시
describe("planSteps", () => {
  const items = [
    { label: "주민등록등본 발급받기", dueOn: "2026-12-05" },
    { label: "접수하기", dueOn: "2026-12-15" },
    { label: "날짜 없는 일", dueOn: null },
  ];
  it("날짜·요일·마감과 날짜 범위", () => {
    const result = planSteps(items, "2026-12-15");
    expect(result.steps).toEqual([
      { date: "12.05", weekday: "토", title: "주민등록등본 발급받기", deadline: false },
      { date: "12.15", weekday: "화", title: "접수하기", deadline: true },
      { date: "날짜 없음", weekday: "", title: "날짜 없는 일", deadline: false },
    ]);
    expect(result.range).toBe("12.05 ~ 12.15");
  });
  it("날짜가 하나면 그 날만, 없으면 빈 글자", () => {
    expect(planSteps([items[0]], null).range).toBe("12.05");
    expect(planSteps([items[2]], null).range).toBe("");
  });
});
