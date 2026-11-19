// spec 016 FR-001·FR-002: 도시가스 한 달 요금 계산. 순수 함수(요금표는 저장소 파일, 부르는 곳 없음)
// 요금표: 한국가스공사 「시도별 용도별 도시가스 소매요금표」 2025-12-01, 원/MJ 부가세 별도 (docs/data-sources.md)
import tariff from "@/watch/gas-tariff.json";

export type GasRegion = {
  name: string; supplier: string;
  /** 주택용 가구당 월 기본요금(원). 여러 값인 지역은 개별난방 값, 읽지 못하면 null(E4) */
  basicFee: number | null; basicFeeNote: string | null;
  cookingPerMj: number; heatingPerMj: number;
};
export type GasTariff = { source: { name: string; url: string; basedOn: string; unit: string; sheet: string }; regions: GasRegion[] };

export const GAS_TARIFF: GasTariff = tariff;

/** 요금표 각주: 취사난방 겸용은 516MJ까지 취사요금, 넘는 만큼 난방요금(지역별로 다소 상이할 수 있음) */
export const COOKING_MJ_LIMIT = 516;
const MAX_MJ = 100_000;
const VAT = 0.1;

export type UsageCheck = { ok: true; mj: number } | { ok: false; message: string };

/** spec 016 E1 */
export function checkGasUsage(input: string): UsageCheck {
  const text = input.replaceAll(",", "").trim();
  if (text === "") return { ok: false, message: "한 달 도시가스 사용량(MJ)을 입력해 주세요. 고지서의 사용량 칸에 있습니다." };
  const mj = Number(text);
  if (!Number.isFinite(mj) || mj < 0 || mj > MAX_MJ) return { ok: false, message: "사용량은 0~100,000MJ 사이로 입력해 주세요." };
  return { ok: true, mj };
}

export type GasBill = { basicFee: number | null; cookingMj: number; heatingMj: number; total: number; totalWithVat: number };

/** spec 016 FR-001, E2~E5: 기본요금 + 516MJ까지 취사 단가 + 넘는 만큼 주택난방 단가. 합계를 한 번에 반올림 */
export function gasBill(region: GasRegion, mj: number): GasBill {
  const cookingMj = Math.min(mj, COOKING_MJ_LIMIT);
  const heatingMj = Math.max(mj - COOKING_MJ_LIMIT, 0);
  const raw = (region.basicFee ?? 0) + cookingMj * region.cookingPerMj + heatingMj * region.heatingPerMj;
  return { basicFee: region.basicFee, cookingMj, heatingMj, total: Math.round(raw), totalWithVat: Math.round(raw * (1 + VAT)) };
}

export type GasReduction = { percent: number; mj: number; total: number; totalWithVat: number };

/** spec 016 FR-002: 그대로·10%·20% 줄였을 때 */
export function gasReductions(region: GasRegion, mj: number): GasReduction[] {
  return [0, 10, 20].map((percent) => {
    const reduced = Math.round(mj * (1 - percent / 100));
    const bill = gasBill(region, reduced);
    return { percent, mj: reduced, total: bill.total, totalWithVat: bill.totalWithVat };
  });
}
