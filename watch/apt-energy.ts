// spec 018 FR-001·FR-002: 국토교통부 「공동주택 에너지 사용 정보」 시군구 평균 에너지 사용금액 해석. 순수 함수(부르기는 apt-energy.server.ts)
// 응답 모양: 2026-11-19 실제 호출 {response:{body:{item:{heat,waterHot,gas,elect,waterCool}},header:{resultCode:"00"}}}

export const APT_ENERGY_SOURCE = {
  name: "국토교통부 「공동주택 에너지 사용 정보」 시군구 평균 에너지 사용금액(K-apt 등록 아파트)",
  url: "https://www.data.go.kr/data/15012964/openapi.do",
} as const;

/** 원/㎡(한 달). spec 018 Q1: 명세에 단위가 없어 실제 값으로 판단했다 */
export type AptEnergy = { perM2: number; parts: { elect: number; heat: number; waterHot: number; gas: number } };

const SHAPE_ERROR = "공동주택 에너지 사용 정보 응답 모양이 다름";
const KST_MS = 9 * 60 * 60 * 1000;

/** FR-002: 작년 같은 달, 그 전 해 같은 달(한국 시각, YYYYMM) */
export function aptEnergyQueryMonths(now: Date): string[] {
  const kst = new Date(now.getTime() + KST_MS);
  const month = String(kst.getUTCMonth() + 1).padStart(2, "0");
  return [1, 2].map((back) => `${kst.getUTCFullYear() - back}${month}`);
}

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** 모든 칸이 0이면 그 시군구 아파트 자료 없음(null, E2). 오류 코드·모양 다름은 던진다(E3) */
export function parseAptEnergy(json: unknown): AptEnergy | null {
  const response = (json as { response?: { header?: { resultCode?: unknown }; body?: { item?: unknown } } } | null)?.response;
  if (!response?.header) throw new Error(SHAPE_ERROR);
  const code = String(response.header.resultCode ?? "");
  if (code !== "00") throw new Error(`공동주택 에너지 사용 정보 오류 ${code}`);
  const item = response.body?.item as Record<string, unknown> | undefined;
  if (!item || ![item.elect, item.heat, item.waterHot, item.gas].every(isNumber)) throw new Error(SHAPE_ERROR);
  const parts = { elect: item.elect as number, heat: item.heat as number, waterHot: item.waterHot as number, gas: item.gas as number };
  const perM2 = parts.elect + parts.heat + parts.waterHot + parts.gas; // 수도(waterCool)는 에너지가 아니라 뺀다
  return perM2 > 0 ? { perM2, parts } : null;
}

/** E4: 원/㎡ × 전용면적, 원 단위 반올림 */
export function aptEnergyCost(perM2: number, areaM2: number): number {
  return Math.round(perM2 * areaM2);
}
