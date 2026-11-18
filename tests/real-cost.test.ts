import { describe, expect, it } from "vitest";
import { compareRealCosts, electricityBill, noticeRentDelta, realCost } from "@/incident/real-cost";

// spec 009 FR-003~006, 경계 E1~E7
describe("electricityBill (한전 주택용 저압, 부가 요금 제외)", () => {
  it("E1: 평소 200kWh = 910 + 24,000, 201kWh = 1,600 + 24,000 + 214.6(원 미만 버림)", () => {
    expect(electricityBill(200, 11)).toBe(24_910);
    expect(electricityBill(201, 11)).toBe(25_814);
  });
  it("평소 450kWh = 7,300 + 200×120 + 200×214.6 + 50×307.3", () => {
    expect(electricityBill(450, 4)).toBe(7_300 + 24_000 + 42_920 + 15_365);
  });
  it("E2: 7월 300kWh는 1단계", () => {
    expect(electricityBill(300, 7)).toBe(910 + 36_000);
  });
  it("E3: 8월 1,100kWh는 1,000kWh 넘는 100kWh에 736.2원", () => {
    const expected = 7_300 + 300 * 120 + 150 * 214.6 + 550 * 307.3 + 100 * 736.2;
    expect(electricityBill(1_100, 8)).toBe(Math.floor(expected));
  });
  it("0kWh는 1단계 기본요금만", () => {
    expect(electricityBill(0, 3)).toBe(910);
  });
});

const base = { monthlyRent: 500_000, maintenanceFee: 100_000, energyCost: null, electricityKwh: null, transitFare: null, tripsPerDay: null, commuteDays: null };

describe("realCost", () => {
  it("E5: 빈 칸은 미입력, 합계에서 빠지고 빠진 칸 이름을 센다", () => {
    expect(realCost(base, 11)).toEqual({
      rent: { value: 500_000, kind: "input" }, fee: { value: 100_000, kind: "input" },
      energy: { value: null, kind: "missing" }, transit: { value: null, kind: "missing" },
      total: 600_000, missing: ["에너지비", "교통비"],
    });
  });
  it("E4: 직접 입력이 kWh보다 먼저", () => {
    expect(realCost({ ...base, energyCost: 50_000, electricityKwh: 200 }, 11).energy).toEqual({ value: 50_000, kind: "input" });
    expect(realCost({ ...base, electricityKwh: 200 }, 11).energy).toEqual({ value: 24_910, kind: "calculated" });
  });
  it("E6: 교통비 = 편도 × 하루 횟수 × 출근 일수, 비면 2회·22일", () => {
    expect(realCost({ ...base, transitFare: 1_500 }, 11).transit).toEqual({ value: 66_000, kind: "calculated" });
    expect(realCost({ ...base, transitFare: 1_500, tripsPerDay: 4, commuteDays: 20 }, 11).transit).toEqual({ value: 120_000, kind: "calculated" });
  });
  it("관리비가 비면 미입력", () => {
    expect(realCost({ ...base, maintenanceFee: null, energyCost: 30_000, transitFare: 1_500 }, 11)).toMatchObject({ total: 596_000, missing: ["관리비"] });
  });
});

describe("compareRealCosts", () => {
  it("합계 낮은 순, 내 집 대비 차이", () => {
    const rows = compareRealCosts({
      myHome: { ...base, energyCost: 50_000, transitFare: 1_500 },
      homes: [
        { id: "a", name: "역 앞", ...base, monthlyRent: 600_000, energyCost: 50_000, transitFare: 0 },
        { id: "b", name: "외곽", ...base, monthlyRent: 400_000, energyCost: 50_000, transitFare: 2_000 },
      ],
      month: 11,
    });
    expect(rows.map((r) => [r.id, r.cost.total, r.diffFromMine])).toEqual([["b", 638_000, -78_000], ["mine", 716_000, 0], ["a", 750_000, 34_000]]);
  });
  it("E7: 내 집이 없으면 차이 없음(null)", () => {
    const rows = compareRealCosts({ myHome: null, homes: [{ id: "a", name: "역 앞", ...base }], month: 11 });
    expect(rows).toEqual([expect.objectContaining({ id: "a", diffFromMine: null })]);
  });
});

describe("noticeRentDelta", () => {
  it("공고 최저 월세 - 내 월세. 하나라도 없으면 null", () => {
    expect(noticeRentDelta(350_000, 500_000)).toBe(-150_000);
    expect(noticeRentDelta(null, 500_000)).toBeNull();
    expect(noticeRentDelta(350_000, null)).toBeNull();
  });
});
