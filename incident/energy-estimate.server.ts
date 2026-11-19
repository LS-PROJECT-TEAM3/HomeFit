import { toKstDate } from "@/watch/kst";
import { fetchHouseholdAverage } from "@/watch/kepco-household.server";
import type { HouseholdAverage } from "@/watch/kepco-household";
import { sigungusNeedingEstimate } from "./energy-estimate";

/** 근거 표시용: 시군구별 한전 값, 불러오지 못한 시군구 수, 추정이 필요했던 시군구 수(spec 017: 0이 아니면 패널 보정 문구를 보인다) */
export type EstimateBasis = { averages: Map<string, HouseholdAverage>; failed: number; requested: number };

type NeedsEstimate = { sigunguCode: string; energyCost: number | null; electricityKwh: number | null };

// spec 011 FR-001: 사용량을 모르는 집의 시군구 가구 평균을 불러온다. 한 시군구가 실패해도 나머지는 계속(E2: 실패한 집은 미입력)
export async function loadEstimateBasis(homes: readonly NeedsEstimate[], now: Date): Promise<EstimateBasis> {
  const today = toKstDate(now);
  const codes = sigungusNeedingEstimate(homes);
  const results = await Promise.allSettled(codes.map((code) => fetchHouseholdAverage(code, today)));
  const averages = new Map<string, HouseholdAverage>();
  let failed = 0;
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      failed += 1;
      console.error("한전 가구평균 불러오기 실패", codes[i], result.reason instanceof Error ? result.reason.message : "알 수 없음");
    } else if (result.value) averages.set(codes[i], result.value);
  });
  return { averages, failed, requested: codes.length };
}
