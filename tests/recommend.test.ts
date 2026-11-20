import { describe, expect, it } from "vitest";
import { recommendHomes } from "@/incident/recommend";
import type { CompareRow, CostItem, RealCost } from "@/incident/real-cost";

// spec 015 FR-001~003, 경계 E2~E5
const item = (value: number | null, kind: CostItem["kind"] = "input"): CostItem => (value === null ? { value: null, kind: "missing" } : { value, kind });

function row(id: string, parts: { rent: number; fee: number | null; energy: number | null; transit: number | null; energyKind?: CostItem["kind"]; energyBasis?: CostItem["basis"] }, isMine = false): CompareRow {
  const missing = [["관리비", parts.fee], ["에너지비", parts.energy], ["교통비", parts.transit]].filter(([, v]) => v === null).map(([k]) => k as string);
  const cost: RealCost = {
    rent: item(parts.rent), fee: item(parts.fee), energy: { ...item(parts.energy, parts.energyKind ?? "input"), ...(parts.energyBasis ? { basis: parts.energyBasis } : {}) }, transit: item(parts.transit),
    total: parts.rent + (parts.fee ?? 0) + (parts.energy ?? 0) + (parts.transit ?? 0),
    missing, estimated: parts.energyKind === "estimated" ? ["에너지비"] : [],
  };
  return { id, name: isMine ? "내 집" : `집 ${id}`, isMine, cost, diffFromMine: null };
}

const full = (id: string, rent: number, extra: Partial<Parameters<typeof row>[1]> = {}) => row(id, { rent, fee: 50_000, energy: 30_000, transit: 60_000, ...extra });

describe("recommendHomes", () => {
  it("FR-001: 칸이 다 찬 관심 주택을 합계 낮은 순으로, 내 집은 순위에 넣지 않는다(Q2)", () => {
    const result = recommendHomes([full("b", 600_000), full("a", 500_000), row("mine", { rent: 550_000, fee: 50_000, energy: 30_000, transit: 60_000 }, true)]);
    expect(result.ranked.map((r) => r.id)).toEqual(["a", "b"]);
    expect(result.ranked.map((r) => r.rank)).toEqual([1, 2]);
  });
  it("FR-002: 미입력 칸이 있는 집은 순위 대신 덜 찬 집으로, 빠진 칸과 함께", () => {
    const cheapButMissing = row("c", { rent: 300_000, fee: 50_000, energy: 30_000, transit: null });
    const result = recommendHomes([full("a", 500_000), cheapButMissing]);
    expect(result.ranked.map((r) => r.id)).toEqual(["a"]);
    expect(result.incomplete).toEqual([{ id: "c", name: "집 c", missing: ["교통비"], reason: "교통비를 넣으면 순위에 들어갑니다." }]);
  });
  it("E2: 모두 덜 찼으면 순위는 비고 덜 찬 집만", () => {
    const result = recommendHomes([row("c", { rent: 300_000, fee: null, energy: null, transit: 1 })]);
    expect(result.ranked).toEqual([]);
    expect(result.incomplete[0].reason).toBe("관리비·에너지비를 넣으면 순위에 들어갑니다.");
  });
  it("E3: 합계가 같으면 들어온 순서 그대로", () => {
    expect(recommendHomes([full("x", 500_000), full("y", 500_000)]).ranked.map((r) => r.id)).toEqual(["x", "y"]);
  });
  it("FR-003·E5: 1위는 '가장 낮음', 나머지는 1위보다 얼마 더", () => {
    const [first, second] = recommendHomes([full("a", 500_000), full("b", 523_400)]).ranked;
    expect(first.reasons[0]).toBe("한 달 실질 주거비 640,000원으로 가장 낮습니다.");
    expect(second.reasons[0]).toBe("한 달 실질 주거비 663,400원, 1위보다 23,400원 더 듭니다.");
  });
  it("FR-003: 내 집이 있으면 내 집 대비, 추정값이 섞였으면 어느 칸인지", () => {
    const mine = row("mine", { rent: 520_000, fee: 50_000, energy: 30_000, transit: 60_000 }, true);
    const cheaper = full("a", 500_000, { energyKind: "estimated", energyBasis: "kepco" });
    const pricier = full("b", 530_000);
    const [a, b] = recommendHomes([cheaper, pricier, mine]).ranked;
    expect(a.reasons).toContain("내 집보다 한 달 20,000원 덜 듭니다.");
    expect(a.reasons).toContain("에너지비는 추정값입니다(한전 시군구 평균 전력사용량).");
    expect(b.reasons).toContain("내 집보다 한 달 10,000원 더 듭니다.");
  });
  // 선우 qa 015 #1(2026-11-20): 아파트는 국토부 금액으로 계산되는데 늘 "한전 시군구 평균"으로 나왔다
  it("추정 근거 문구는 실제 계산 방법을 따른다", () => {
    const note = (basis?: CostItem["basis"]) => recommendHomes([full("a", 500_000, { energyKind: "estimated", energyBasis: basis })]).ranked[0].reasons.at(-1);
    expect(note("apt")).toBe("에너지비는 추정값입니다(국토부 시군구 아파트 평균 금액 × 전용면적).");
    expect(note("kepco")).toBe("에너지비는 추정값입니다(한전 시군구 평균 전력사용량).");
    expect(note("national")).toBe("에너지비는 추정값입니다(가구에너지패널 전국 평균 전력사용량).");
    expect(note(undefined)).toBe("에너지비는 추정값입니다.");
  });
  it("E4: 내 집이 없으면 내 집 대비 문장이 없다", () => {
    const [a] = recommendHomes([full("a", 500_000)]).ranked;
    expect(a.reasons.some((r) => r.includes("내 집"))).toBe(false);
  });
  it("내 집과 같으면 '같습니다'", () => {
    const mine = row("mine", { rent: 500_000, fee: 50_000, energy: 30_000, transit: 60_000 }, true);
    expect(recommendHomes([full("a", 500_000), mine]).ranked[0].reasons).toContain("내 집과 한 달 실질 주거비가 같습니다.");
  });
});
