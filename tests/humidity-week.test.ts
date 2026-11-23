import { describe, expect, it } from "vitest";
import { humidityWeek } from "@/incident/humidity-week";

// spec 022 FR-011(집 점검 하자·환경 기록 보드 v2-qc-log-pc): 최근 7일 실내 습도 점. 입력한 날만 점, 안 한 날은 비움
const m = (date: string, humidityPct: number, time = "09:00") => ({ measuredAt: `${date}T${time}:00+09:00`, humidityPct });

describe("humidityWeek", () => {
  it("오늘까지 7일 칸, 입력한 날만 점(가장 큰 값이 위)", () => {
    const week = humidityWeek([m("2026-11-19", 60), m("2026-11-17", 76), m("2026-11-15", 62), m("2026-11-13", 64)], "2026-11-19");
    expect(week.days.map((d) => d.label)).toEqual(["11.13", "14", "15", "16", "17", "18", "19"]);
    expect(week.days.map((d) => d.hasValue)).toEqual([true, false, true, false, true, false, true]);
    expect(week.points.map((p) => p.value)).toEqual([64, 62, 76, 60]);
    const top = week.points.find((p) => p.value === 76)!;
    const bottom = week.points.find((p) => p.value === 60)!;
    expect(top.y).toBeLessThan(bottom.y);
    expect(week.points[0].x).toBe(14);
    expect(week.points[3].x).toBe(426);
  });
  it("같은 날 여러 번이면 마지막 값", () => {
    const week = humidityWeek([m("2026-11-19", 55, "08:00"), m("2026-11-19", 61, "21:00")], "2026-11-19");
    expect(week.points.map((p) => p.value)).toEqual([61]);
  });
  it("7일보다 오래된 값은 빼고, 없으면 빈 목록", () => {
    expect(humidityWeek([m("2026-11-01", 70)], "2026-11-19").points).toEqual([]);
  });
});
