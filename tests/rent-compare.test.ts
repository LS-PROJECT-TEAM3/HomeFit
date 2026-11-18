import { describe, expect, it } from "vitest";
import { compareArea, compareHome, median, selectTrades } from "@/incident/rent-compare";
import type { Trade } from "@/watch/rtms";

// spec 008 FR-003·004·005, 경계 E1·E2·E3·E5·E9
const trade = (over: Partial<Trade> = {}): Trade => ({
  housingType: "officetel", sigunguCode: "30170", dealYm: "2026-10", areaM2: 30, contractType: "monthly", deposit: 10_000_000, monthlyRent: 500_000, ...over,
});
const basis = { sigunguCode: "30170", housingType: "officetel" as const, areaM2: 30, contractType: "monthly" as const };
const five = (over: Partial<Trade> = {}) => Array.from({ length: 5 }, () => trade(over));

describe("selectTrades", () => {
  it("같은 시군구·유형·계약 형태, E9 면적 ±20% 경계 포함", () => {
    const list = [
      trade({ areaM2: 24 }), trade({ areaM2: 36 }), trade({ areaM2: 23.9 }), trade({ areaM2: 36.1 }),
      trade({ sigunguCode: "30110" }), trade({ housingType: "apartment" }), trade({ contractType: "jeonse", monthlyRent: 0 }),
    ];
    expect(selectTrades(list, basis).map((t) => t.areaM2)).toEqual([24, 36]);
  });
});

describe("median", () => {
  it("홀수는 가운데, 짝수는 가운데 둘 평균(반올림), 비면 null", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(3);
    expect(median([])).toBeNull();
  });
});

describe("compareHome", () => {
  const home = { ...basis, deposit: 10_000_000, monthlyRent: 500_000 };
  it("E1: 거래 4건이면 비교하지 않는다(거래 부족)", () => {
    expect(compareHome(home, five().slice(0, 4))).toMatchObject({ enough: false, count: 4, diffs: [] });
  });
  it("E2: 정확히 10%면 알림, 9.9%면 없음", () => {
    expect(compareHome(home, five({ monthlyRent: 550_000 })).diffs).toEqual([{ field: "monthlyRent", base: 500_000, median: 550_000, percent: 10 }]);
    expect(compareHome(home, five({ monthlyRent: 549_500 })).diffs).toEqual([]);
  });
  it("E3: 월세는 그대로, 보증금만 12% 오르면 알림(월세·보증금 둘 다 비교, 사용자 결정)", () => {
    expect(compareHome(home, five({ deposit: 11_200_000 })).diffs).toEqual([{ field: "deposit", base: 10_000_000, median: 11_200_000, percent: 12 }]);
  });
  it("낮아진 것도 알림(음수 %), 전세는 보증금만", () => {
    const jeonse = { ...basis, contractType: "jeonse" as const, deposit: 100_000_000, monthlyRent: 0 };
    const result = compareHome(jeonse, five({ contractType: "jeonse", monthlyRent: 0, deposit: 85_000_000 }));
    expect(result).toMatchObject({ enough: true, count: 5, medianDeposit: 85_000_000, medianRent: null, areaMin: 24, areaMax: 36 });
    expect(result.diffs).toEqual([{ field: "deposit", base: 100_000_000, median: 85_000_000, percent: -15 }]);
  });
  it("내 보증금이 0이면 보증금은 비교하지 않는다", () => {
    expect(compareHome({ ...home, deposit: 0 }, five({ deposit: 5_000_000 })).diffs).toEqual([]);
  });
});

describe("compareArea", () => {
  const area = { ...basis, lastMedianRent: null, lastMedianDeposit: null };
  it("E5: 처음 본 달은 값만 다음 기준으로, 알림 없음", () => {
    expect(compareArea(area, five())).toMatchObject({ diffs: [], next: { rent: 500_000, deposit: 10_000_000 } });
  });
  it("지난번 값보다 10% 이상 바뀌면 알림, 다음 기준은 새 값", () => {
    const result = compareArea({ ...area, lastMedianRent: 400_000, lastMedianDeposit: 10_000_000 }, five());
    expect(result.diffs).toEqual([{ field: "monthlyRent", base: 400_000, median: 500_000, percent: 25 }]);
    expect(result.next).toEqual({ rent: 500_000, deposit: 10_000_000 });
  });
  it("E1: 거래가 부족하면 지난번 값을 그대로 둔다(next 없음)", () => {
    expect(compareArea({ ...area, lastMedianRent: 400_000 }, five().slice(0, 2))).toMatchObject({ enough: false, diffs: [], next: null });
  });
});
