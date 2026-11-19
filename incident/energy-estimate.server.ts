import { toKstDate } from "@/watch/kst";
import { fetchHouseholdAverage } from "@/watch/kepco-household.server";
import type { HouseholdAverage } from "@/watch/kepco-household";
import { fetchAptEnergy, type AptEnergyAverage } from "@/watch/apt-energy.server";
import { sigungusNeedingAptEstimate, sigungusNeedingEstimate } from "./energy-estimate";
import type { HousingType } from "./home-form";

/**
 * 근거 표시용: 시군구별 한전 값·아파트 평균 사용금액, 불러오지 못한 시군구 수, 추정이 필요했던 시군구 수
 * (spec 017: requested가 0이 아니면 패널 보정 문구, spec 018: aptAverages가 있으면 아파트 금액 문구)
 */
export type EstimateBasis = {
  averages: Map<string, HouseholdAverage>; failed: number; requested: number;
  aptAverages: Map<string, AptEnergyAverage>; aptFailed: number;
};

type NeedsEstimate = { sigunguCode: string; energyCost: number | null; electricityKwh: number | null; housingType?: HousingType; exclusiveAreaM2?: number | null };

/** 시군구마다 불러 모은다. 한 곳이 실패해도 나머지는 계속하고 실패 수를 센다 */
async function settleByCode<V>(codes: string[], load: (code: string) => Promise<V | null>, label: string): Promise<{ values: Map<string, V>; failed: number }> {
  const results = await Promise.allSettled(codes.map(load));
  const values = new Map<string, V>();
  let failed = 0;
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      failed += 1;
      console.error(`${label} 불러오기 실패`, codes[i], result.reason instanceof Error ? result.reason.message : "알 수 없음");
    } else if (result.value) values.set(codes[i], result.value);
  });
  return { values, failed };
}

// spec 011 FR-001·spec 018 FR-001: 사용량을 모르는 집의 시군구 한전 평균과, 그중 아파트의 시군구 평균 사용금액을 함께 부른다
export async function loadEstimateBasis(homes: readonly NeedsEstimate[], now: Date): Promise<EstimateBasis> {
  const today = toKstDate(now);
  const codes = sigungusNeedingEstimate(homes);
  const [kepco, apt] = await Promise.all([
    settleByCode(codes, (code) => fetchHouseholdAverage(code, today), "한전 가구평균"),
    settleByCode(sigungusNeedingAptEstimate(homes), (code) => fetchAptEnergy(code, today), "공동주택 에너지 사용 정보"),
  ]);
  return { averages: kepco.values, failed: kepco.failed, requested: codes.length, aptAverages: apt.values, aptFailed: apt.failed };
}
