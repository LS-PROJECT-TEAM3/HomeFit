import type { HourlyForecast } from "@/incident/condensation";
import { latestBaseTime, parseKmaForecast } from "@/watch/kma";
import { gridForSigungu } from "@/watch/kma-grid";
import type { BaseTime, ForecastFetcher } from "@/watch/kma.server";

// FR-003 (spec 003): 시군구마다 예보를 한 번 읽는다. DB는 쓰지 않는다(부르는 함수는 인자로 받는다)

export type Collected = {
  bySigungu: Map<string, HourlyForecast[]>;
  base: BaseTime;
  /** 시군구 격자가 없어 같은 시의 구·시도 대표 격자를 쓴 곳 */
  fallback: number;
  /** 격자를 몰라 읽지 못한 곳 */
  unknown: number;
  failed: { sigunguCode: string; reason: string }[];
};

function reasonOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * 3단계 리뷰 1: 한 시군구가 실패해도 나머지는 계속한다(plan 003 5절). 실패한 곳은 그 회차에 사건이 생기지 않는다(spec FR-003 수용 기준 2).
 * 읽으려던 곳이 모두 실패하면 회차 전체를 수집 오류로 던진다("변화 없음"으로 끝내지 않음).
 */
export async function collectForecasts(sigunguCodes: readonly string[], fetchForecast: ForecastFetcher, now: Date): Promise<Collected> {
  const collected: Collected = { bySigungu: new Map(), base: latestBaseTime(now), fallback: 0, unknown: 0, failed: [] };
  let attempted = 0;
  for (const sigunguCode of new Set(sigunguCodes)) {
    const grid = gridForSigungu(sigunguCode);
    if (!grid) {
      collected.unknown += 1;
      continue;
    }
    if (grid.precision !== "sigungu") collected.fallback += 1;
    attempted += 1;
    try {
      collected.bySigungu.set(sigunguCode, parseKmaForecast(await fetchForecast(grid, collected.base)));
    } catch (cause) {
      collected.failed.push({ sigunguCode, reason: reasonOf(cause) });
    }
  }
  if (attempted > 0 && collected.failed.length === attempted) {
    throw new Error(`기상청 예보를 ${attempted}곳 모두 실패: ${collected.failed[0].reason}`);
  }
  return collected;
}
