import { describe, expect, it } from "vitest";
import { planRentIncidents, rentTargetKeys } from "@/incident/rent-detect";
import type { Trade } from "@/watch/rtms";

// spec 008 FR-004·005, 경계 E4·E5·E6
const trade = (over: Partial<Trade> = {}): Trade => ({
  housingType: "officetel", sigunguCode: "30170", dealYm: "2026-10", areaM2: 30, contractType: "monthly", deposit: 10_000_000, monthlyRent: 600_000, ...over,
});
const trades = Array.from({ length: 5 }, () => trade());
const home = { homeId: "h1", userId: "u1", sigunguCode: "30170", housingType: "officetel" as const, areaM2: 30, contractType: "monthly" as const, deposit: 10_000_000, monthlyRent: 500_000, contractEndDate: "2027-08-31" };
const area = { areaId: "a1", userId: "u2", sigunguCode: "30170", housingType: "officetel" as const, areaM2: 30, contractType: "monthly" as const, lastMedianRent: 500_000, lastMedianDeposit: 10_000_000 };
const base = { trades, runYm: "2026-11", months: ["2026-08", "2026-10"] as [string, string] };

describe("planRentIncidents", () => {
  it("내 집: 중간값 60만 > 내 월세 50만(20%) → 알림, 할 날은 만료 2달 전, 같은 달 키", () => {
    const plan = planRentIncidents({ ...base, homes: [home], areas: [] });
    expect(plan.create).toHaveLength(1);
    expect(plan.create[0]).toMatchObject({ userId: "u1", targetKind: "home", targetId: "h1", dedupKey: "rent:home:h1:2026-11" });
    expect(plan.create[0].facts).toMatchObject({
      kind: "rent", target: "home", dueDate: "2027-06-30", count: 5, medianRent: 600_000, months: ["2026-08", "2026-10"],
      diffs: [{ field: "monthlyRent", base: 500_000, median: 600_000, percent: 20 }],
    });
    expect(plan.create[0].facts.title).toBe("내 집 주변 오피스텔 월세 시세가 내 계약보다 20% 높습니다");
  });
  it("E4: 계약 형태나 금액이 없는 집은 대상이 아니다", () => {
    expect(planRentIncidents({ ...base, homes: [{ ...home, contractType: null }], areas: [] }).create).toEqual([]);
    expect(planRentIncidents({ ...base, homes: [{ ...home, monthlyRent: null }], areas: [] }).create).toEqual([]);
  });
  it("관심 지역: 지난번보다 20% 오름 → 알림, 다음 기준 갱신, 할 날 없음", () => {
    const plan = planRentIncidents({ ...base, homes: [], areas: [area] });
    expect(plan.create[0]).toMatchObject({ targetKind: "interest_area", targetId: "a1", dedupKey: "rent:area:a1:2026-11", facts: { dueDate: null } });
    expect(plan.create[0].facts.title).toBe("관심 지역 오피스텔 월세 시세가 지난번보다 20% 올랐습니다");
    expect(plan.areaUpdates).toEqual([{ areaId: "a1", rent: 600_000, deposit: 10_000_000 }]);
  });
  it("E5: 관심 지역 첫 달은 값만 저장", () => {
    const plan = planRentIncidents({ ...base, homes: [], areas: [{ ...area, lastMedianRent: null, lastMedianDeposit: null }] });
    expect(plan.create).toEqual([]);
    expect(plan.areaUpdates).toEqual([{ areaId: "a1", rent: 600_000, deposit: 10_000_000 }]);
  });
  it("세어 둔 수(관찰값용): 대상마다 거래 수·중간값", () => {
    const plan = planRentIncidents({ ...base, homes: [home], areas: [area] });
    expect(plan.observed.map((o) => [o.target, o.count, o.medianRent])).toEqual([["home:h1", 5, 600_000], ["area:a1", 5, 600_000]]);
  });
});

describe("rentTargetKeys", () => {
  it("부를 시군구 × 유형만, 겹치지 않게", () => {
    expect(rentTargetKeys([home, { ...home, homeId: "h2" }], [area, { ...area, housingType: "apartment" }])).toEqual([
      { sigunguCode: "30170", housingType: "officetel" }, { sigunguCode: "30170", housingType: "apartment" },
    ]);
  });
});
