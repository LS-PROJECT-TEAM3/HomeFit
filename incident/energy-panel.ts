// spec 017 FR-001: 가구에너지패널조사(14차, 2023년 기준) 전국 가구당 일반전기로 주택 종류·면적 보정 비율. 순수 함수
import panel from "@/watch/energy-panel.json";
import type { HousingType } from "./home-form";

type AreaBand = { label: string; belowM2: number | null; kwh: number };
export type EnergyPanel = {
  source: { name: string; url: string; basedOn: string; unit: string; sheet: string };
  nationalKwhPerYear: number;
  byTypeKwhPerYear: { detached: number; multiFamily: number; apartment: number };
  byAreaKwhPerYear: AreaBand[];
};

export const ENERGY_PANEL: EnergyPanel = panel;

// spec 017 Q1: 결과표에 오피스텔 칸이 없어 "다세대/연립/기타"로 본다
const TYPE_COLUMN: Record<HousingType, keyof EnergyPanel["byTypeKwhPerYear"]> = {
  apartment: "apartment", officetel: "multiFamily", row_house: "multiFamily", detached: "detached",
};

/** spec 017 E3: 결과표 구간 "33-66㎡미만"처럼 아래 경계는 그 구간에 들어간다 */
export function areaBandIndex(areaM2: number): number {
  const index = ENERGY_PANEL.byAreaKwhPerYear.findIndex((band) => band.belowM2 !== null && areaM2 < band.belowM2);
  return index === -1 ? ENERGY_PANEL.byAreaKwhPerYear.length - 1 : index;
}

/** 면적 비율 × 종류 비율(spec 017 Q2). 면적을 모르면 면적 비율은 1(E2) */
export function panelFactor(housingType: HousingType, areaM2: number | null): number {
  const national = ENERGY_PANEL.nationalKwhPerYear;
  const typeRatio = ENERGY_PANEL.byTypeKwhPerYear[TYPE_COLUMN[housingType]] / national;
  const areaRatio = areaM2 === null ? 1 : ENERGY_PANEL.byAreaKwhPerYear[areaBandIndex(areaM2)].kwh / national;
  return typeRatio * areaRatio;
}

/** 한전 값이 없을 때 기준: 전국 가구당 연간 일반전기 ÷ 12 (spec 017 E4) */
export function panelMonthlyKwh(): number {
  return ENERGY_PANEL.nationalKwhPerYear / 12;
}
