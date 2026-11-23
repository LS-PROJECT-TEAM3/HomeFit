import { describe, expect, it } from "vitest";
import { completeTotal, diffFromMineText, lowestItems, toggleCompare, type CostItemKey } from "@/incident/compare-tray";
import type { RealCost } from "@/incident/real-cost";

// spec 022 FR-011(집 비교 보드 v2-compare-tray·list-none), spec 009 FR-005, spec 015 FR-001(네 칸이 모두 찬 집만 합계)
function cost(rent: number | null, fee: number | null, energy: number | null, transit: number | null): RealCost {
  const item = (value: number | null) => (value === null ? { value, kind: "missing" as const } : { value, kind: "input" as const });
  const values = [rent, fee, energy, transit];
  return { rent: item(rent), fee: item(fee), energy: item(energy), transit: item(transit), total: values.reduce<number>((s, v) => s + (v ?? 0), 0), missing: [], estimated: [] };
}

describe("completeTotal", () => {
  it("네 칸이 모두 있으면 합계", () => {
    expect(completeTotal(cost(550000, 80000, 95000, 62000))).toBe(787000);
  });
  it("한 칸이라도 비면 null(합계 없음)", () => {
    expect(completeTotal(cost(480000, 40000, 110000, null))).toBe(null);
  });
});

describe("lowestItems (항목별 가장 낮은 칸)", () => {
  const mine = cost(550000, 80000, 95000, 62000);
  const office = cost(520000, 60000, 70000, 88000);
  const apt = cost(610000, 110000, 85000, 70000);
  it("보드 예시: 교통비는 내 집, 월세·관리비·에너지비는 역세권 오피스텔", () => {
    const result = lowestItems([mine, office, apt]);
    expect([...result[0]]).toEqual<CostItemKey[]>(["transit"]);
    expect([...result[1]].sort()).toEqual<CostItemKey[]>(["energy", "fee", "rent"]);
    expect([...result[2]]).toEqual([]);
  });
  it("카드가 하나면 칠하지 않음", () => {
    expect([...lowestItems([mine])[0]]).toEqual([]);
  });
  it("같은 값은 둘 다, 값이 한 집에만 있으면 칠하지 않음(미입력은 비교에서 뺌)", () => {
    const result = lowestItems([cost(500000, null, 1, 1), cost(500000, 50000, 2, 2)]);
    expect(result[0].has("rent") && result[1].has("rent")).toBe(true);
    expect(result[0].has("fee") || result[1].has("fee")).toBe(false);
  });
});

describe("diffFromMineText", () => {
  it("낮으면 낮아요, 높으면 높아요, 같으면 같아요", () => {
    expect(diffFromMineText(738000, 787000)).toEqual({ text: "내 집보다 49,000원 낮아요", tone: "lower" });
    expect(diffFromMineText(875000, 787000)).toEqual({ text: "내 집보다 88,000원 높아요", tone: "higher" });
    expect(diffFromMineText(787000, 787000)).toEqual({ text: "내 집과 같아요", tone: "same" });
  });
  it("어느 한쪽 합계가 없으면 null", () => {
    expect(diffFromMineText(null, 787000)).toBe(null);
    expect(diffFromMineText(738000, null)).toBe(null);
  });
});

describe("toggleCompare (두 곳까지)", () => {
  it("넣고 빼기", () => {
    expect(toggleCompare(["a"], "b")).toEqual({ selected: ["a", "b"], refused: false });
    expect(toggleCompare(["a", "b"], "a")).toEqual({ selected: ["b"], refused: false });
  });
  it("두 곳이 찼으면 세 번째는 넣지 않음", () => {
    expect(toggleCompare(["a", "b"], "c")).toEqual({ selected: ["a", "b"], refused: true });
  });
});
