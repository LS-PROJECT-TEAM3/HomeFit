import { describe, expect, it } from "vitest";
import { GAS_TARIFF, checkGasUsage, gasBill, gasReductions, type GasRegion } from "@/incident/gas-bill";

// spec 016 FR-001·FR-002, 경계 E1~E5
const seoul = GAS_TARIFF.regions.find((r) => r.name === "서울특별시") as GasRegion;
const gwangju = GAS_TARIFF.regions.find((r) => r.name === "광주시") as GasRegion;

describe("요금표 파일(watch/gas-tariff.json)", () => {
  it("2025-12-01 기준, 지역 32곳, 단가는 모두 양수", () => {
    expect(GAS_TARIFF.source.basedOn).toBe("2025-12-01");
    expect(GAS_TARIFF.regions).toHaveLength(32);
    for (const r of GAS_TARIFF.regions) {
      expect(r.cookingPerMj).toBeGreaterThan(0);
      expect(r.heatingPerMj).toBeGreaterThan(0);
    }
  });
});

describe("checkGasUsage (E1)", () => {
  it("비었거나 숫자가 아니거나 0 미만·100,000 초과면 고칠 방법을 알린다", () => {
    expect(checkGasUsage("")).toEqual({ ok: false, message: "한 달 도시가스 사용량(MJ)을 입력해 주세요. 고지서의 사용량 칸에 있습니다." });
    expect(checkGasUsage("abc").ok).toBe(false);
    expect(checkGasUsage("-1").ok).toBe(false);
    expect(checkGasUsage("100001")).toEqual({ ok: false, message: "사용량은 0~100,000MJ 사이로 입력해 주세요." });
  });
  it("쉼표가 있어도 읽는다", () => {
    expect(checkGasUsage("1,500")).toEqual({ ok: true, mj: 1500 });
  });
});

describe("gasBill (FR-001)", () => {
  it("손 계산과 같다: 서울 1,500MJ = 1,250 + 516×22.3617 + 984×22.3617 → 34,793원, 부가세 포함 38,272원", () => {
    expect(gasBill(seoul, 1500)).toEqual({ basicFee: 1250, cookingMj: 516, heatingMj: 984, total: 34_793, totalWithVat: 38_272 });
  });
  it("E3: 516MJ를 넘는 만큼만 난방 단가(광주는 취사·난방 단가가 다르다)", () => {
    // 750 + 516×22.0252 + 484×23.297 = 23,390.75
    expect(gasBill(gwangju, 1000).total).toBe(23_391);
    expect(gasBill(gwangju, 516)).toMatchObject({ cookingMj: 516, heatingMj: 0 });
  });
  it("E2: 0MJ면 기본요금만", () => {
    expect(gasBill(seoul, 0)).toMatchObject({ total: 1250, totalWithVat: 1375 });
  });
  it("E4: 기본요금을 읽지 못한 지역은 기본요금 없이", () => {
    const noFee: GasRegion = { ...seoul, basicFee: null };
    expect(gasBill(noFee, 0)).toMatchObject({ basicFee: null, total: 0 });
  });
});

describe("gasReductions (FR-002)", () => {
  it("그대로·10%·20% 줄였을 때", () => {
    const rows = gasReductions(seoul, 1500);
    expect(rows.map((r) => [r.percent, r.mj])).toEqual([[0, 1500], [10, 1350], [20, 1200]]);
    expect(rows[0].total).toBe(34_793);
    expect(rows[1].total).toBeLessThan(rows[0].total);
  });
});
