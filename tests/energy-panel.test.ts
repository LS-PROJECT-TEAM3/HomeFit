import { describe, expect, it } from "vitest";
import { ENERGY_PANEL, areaBandIndex, panelFactor, panelMonthlyKwh } from "@/incident/energy-panel";

// spec 017 FR-001, 경계 E2·E3
const national = 3013.8;

describe("자료 파일(watch/energy-panel.json)이 결과표 값과 같다", () => {
  it("전국·주택 종류·면적 구간 일반전기 kWh/년", () => {
    expect(ENERGY_PANEL.nationalKwhPerYear).toBe(national);
    expect(ENERGY_PANEL.byTypeKwhPerYear).toEqual({ detached: 2951.6, multiFamily: 2900.8, apartment: 3086.4 });
    expect(ENERGY_PANEL.byAreaKwhPerYear.map((b) => b.kwh)).toEqual([2019.8, 2813.3, 3190.6, 3364.2, 4000.8]);
  });
});

describe("areaBandIndex (E3)", () => {
  it("33㎡ 미만 / 33~66 / 66~99 / 99~132 / 132 이상, 경계 값은 위 구간", () => {
    expect([10, 32.9, 33, 65.9, 66, 98.9, 99, 131.9, 132, 300].map(areaBandIndex)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });
});

describe("panelFactor (FR-001)", () => {
  it("면적 비율 × 종류 비율", () => {
    expect(panelFactor("apartment", 80)).toBeCloseTo((3190.6 / national) * (3086.4 / national), 6);
    expect(panelFactor("detached", 140)).toBeCloseTo((4000.8 / national) * (2951.6 / national), 6);
  });
  it("Q1: 오피스텔과 연립·다세대는 다세대/연립/기타 칸", () => {
    expect(panelFactor("officetel", 20)).toBeCloseTo((2019.8 / national) * (2900.8 / national), 6);
    expect(panelFactor("row_house", 20)).toBe(panelFactor("officetel", 20));
  });
  it("E2: 면적을 모르면 종류 비율만", () => {
    expect(panelFactor("apartment", null)).toBeCloseTo(3086.4 / national, 6);
  });
  it("SC-001: 같은 종류면 작은 집이 더 작은 비율", () => {
    expect(panelFactor("officetel", 20)).toBeLessThan(panelFactor("officetel", 50));
  });
});

describe("panelMonthlyKwh", () => {
  it("전국 연간 평균 ÷ 12", () => {
    expect(panelMonthlyKwh()).toBeCloseTo(national / 12, 6);
  });
});
