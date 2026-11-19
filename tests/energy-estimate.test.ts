import { describe, expect, it } from "vitest";
import { barHeights, homeUsage, householdAverageKwh, sigungusNeedingEstimate, usageTier, withEstimate, yearlyBills } from "@/incident/energy-estimate";
import { panelFactor, panelMonthlyKwh } from "@/incident/energy-panel";
import { electricityBill, realCost, type CostInput } from "@/incident/real-cost";

// spec 011 FR-001~003, 경계 E1~E4
describe("householdAverageKwh (시군구 가구 평균, E2)", () => {
  it("양수면 그대로 쓴다", () => {
    expect(householdAverageKwh(296)).toBe(296);
  });
  it("값이 없음·0·음수·숫자 아님이면 추정하지 않는다", () => {
    for (const bad of [null, undefined, 0, -10, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(householdAverageKwh(bad)).toBeNull();
    }
  });
});

describe("yearlyBills (12개월 예상 요금, E4)", () => {
  it("1~12월, 달마다 electricityBill과 같다", () => {
    const rows = yearlyBills(350);
    expect(rows.map((r) => r.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    for (const r of rows) expect(r.bill).toBe(electricityBill(350, r.month));
  });
  it("350kWh는 7·8월(하계 300·450 구간)이 다른 달보다 싸다", () => {
    const rows = yearlyBills(350);
    expect(rows[6].bill).toBeLessThan(rows[5].bill);
    expect(rows[7].bill).toBe(rows[6].bill);
  });
});

const base: CostInput = {
  monthlyRent: 500_000, maintenanceFee: 70_000, energyCost: null, electricityKwh: null,
  transitFare: null, tripsPerDay: null, commuteDays: null,
};

describe("realCost 에너지비 순서: 입력 > 계산 > 추정 > 미입력 (FR-002)", () => {
  it("E1: 직접 입력이나 kWh가 있으면 추정하지 않는다", () => {
    expect(realCost({ ...base, energyCost: 30_000, estimatedKwh: 296 }, 11).energy.kind).toBe("input");
    expect(realCost({ ...base, electricityKwh: 200, estimatedKwh: 296 }, 11).energy.kind).toBe("calculated");
  });
  it("둘 다 없고 추정 kWh가 있으면 요금표로 계산해 추정값으로 표시하고 합계에 넣는다", () => {
    const cost = realCost({ ...base, estimatedKwh: 296 }, 11);
    expect(cost.energy).toEqual({ value: electricityBill(296, 11), kind: "estimated" });
    expect(cost.total).toBe(500_000 + 70_000 + electricityBill(296, 11));
    expect(cost.missing).not.toContain("에너지비");
    expect(cost.estimated).toEqual(["에너지비"]);
  });
  it("E2: 추정 kWh도 없으면 미입력", () => {
    const cost = realCost({ ...base, estimatedKwh: null }, 11);
    expect(cost.energy.kind).toBe("missing");
    expect(cost.estimated).toEqual([]);
  });
});

describe("sigungusNeedingEstimate (E1)", () => {
  it("입력·kWh가 없는 집의 시군구만, 겹치지 않게", () => {
    const homes = [
      { sigunguCode: "11680", energyCost: null, electricityKwh: null },
      { sigunguCode: "11680", energyCost: null, electricityKwh: null },
      { sigunguCode: "11440", energyCost: 30_000, electricityKwh: null },
      { sigunguCode: "11200", energyCost: null, electricityKwh: 250 },
      { sigunguCode: "41135", energyCost: null, electricityKwh: null },
    ];
    expect(sigungusNeedingEstimate(homes)).toEqual(["11680", "41135"]);
  });
});

describe("withEstimate (spec 017 FR-002)", () => {
  const averages = new Map([["11680", { kwh: 326.76 }]]);
  it("한전 시군구 평균 × 주택 종류·면적 비율, 소수 첫째 자리(E5)", () => {
    const home = { sigunguCode: "11680", housingType: "officetel" as const, exclusiveAreaM2: 20 };
    const result = withEstimate(home, averages);
    expect(result.estimatedKwh).toBe(Math.round(326.76 * panelFactor("officetel", 20) * 10) / 10);
    expect(result.estimateBasis).toBe("kepco");
  });
  it("E4: 한전 값이 없으면 패널 전국 평균 × 비율(미입력으로 두지 않음)", () => {
    const result = withEstimate({ sigunguCode: "41135", housingType: "apartment" as const, exclusiveAreaM2: 84 }, averages);
    expect(result.estimatedKwh).toBe(Math.round(panelMonthlyKwh() * panelFactor("apartment", 84) * 10) / 10);
    expect(result.estimateBasis).toBe("national");
  });
  it("SC-001: 같은 시군구에서 작은 집이 덜 나온다", () => {
    const small = withEstimate({ sigunguCode: "11680", housingType: "officetel" as const, exclusiveAreaM2: 20 }, averages).estimatedKwh ?? 0;
    const large = withEstimate({ sigunguCode: "11680", housingType: "apartment" as const, exclusiveAreaM2: 110 }, averages).estimatedKwh ?? 0;
    expect(small).toBeLessThan(large);
  });
});

describe("homeUsage (에너지 분석 한 달 사용량)", () => {
  it("넣은 kWh가 먼저, 없으면 추정, 둘 다 없으면 null", () => {
    expect(homeUsage({ electricityKwh: 250, estimatedKwh: 326 })).toEqual({ kwh: 250, kind: "input" });
    expect(homeUsage({ electricityKwh: null, estimatedKwh: 326 })).toEqual({ kwh: 326, kind: "estimated" });
    expect(homeUsage({ electricityKwh: null, estimatedKwh: null })).toBeNull();
  });
  it("코드 점검 1: 넣은 0kWh도 넣은 값이다(집 비교의 계산과 같게)", () => {
    expect(homeUsage({ electricityKwh: 0, estimatedKwh: 326 })).toEqual({ kwh: 0, kind: "input" });
  });
});

describe("usageTier (누진 구간, 그래프 글자용)", () => {
  it("평소 200·400, 여름 300·450 경계", () => {
    expect(usageTier(200, 11)).toEqual({ tier: 1, limits: [200, 400] });
    expect(usageTier(317.56, 11)).toEqual({ tier: 2, limits: [200, 400] });
    expect(usageTier(317.56, 7)).toEqual({ tier: 2, limits: [300, 450] });
    expect(usageTier(451, 8)).toEqual({ tier: 3, limits: [300, 450] });
  });
});

describe("barHeights (막대 높이)", () => {
  it("가장 큰 값이 최대 높이, 나머지는 비례", () => {
    expect(barHeights([50, 100, 25], 80)).toEqual([40, 80, 20]);
  });
  it("모두 0이거나 비면 0", () => {
    expect(barHeights([0, 0], 80)).toEqual([0, 0]);
    expect(barHeights([], 80)).toEqual([]);
  });
});
