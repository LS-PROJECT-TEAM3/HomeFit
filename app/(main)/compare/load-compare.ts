import { costInput } from "@/app/_components/cost-fields";
import { withEstimate } from "@/incident/energy-estimate";
import { loadEstimateBasis } from "@/incident/energy-estimate.server";
import type { HousingType } from "@/incident/home-form";
import type { InterestHomeInput } from "@/incident/interest-home-form";
import { listMyInterestHomes, type InterestHome } from "@/incident/interest-homes.server";
import { realCost, type RealCost } from "@/incident/real-cost";
import { loadMyHome } from "../my/home/load";
import { kstMonth } from "./cost-view";

export type CompareHome = {
  id: string; name: string; housingType: HousingType; exclusiveAreaM2: number | null; cost: RealCost;
  /** 고치기 창에 채울 값 */
  input: InterestHomeInput;
};
export type LoadedCompare = {
  /** 내 집. 월세(계약)를 모르면 null (spec 009 E7) */
  mine: { housingType: HousingType; exclusiveAreaM2: number; cost: RealCost } | null;
  homes: CompareHome[];
};

const str = (v: number | null) => (v === null ? "" : String(v));

function toInput(home: InterestHome): InterestHomeInput {
  return {
    name: home.name, sidoCode: home.sigunguCode.slice(0, 2), sigunguCode: home.sigunguCode, housingType: home.housingType,
    exclusiveArea: str(home.exclusiveAreaM2), areaUnit: "m2", deposit: str(home.deposit), monthlyRent: String(home.monthlyRent),
    maintenanceFee: str(home.maintenanceFee), ...costInput(home),
  };
}

/** spec 022 FR-011(집 비교 한 화면, IA v1.17), spec 009 FR-005, spec 011 FR-002: 내 집과 관심 주택의 한 달 실질 주거비. 읽기 실패는 던진다 */
export async function loadCompare(userId: string): Promise<LoadedCompare> {
  const [{ home }, homes] = await Promise.all([loadMyHome(userId), listMyInterestHomes(userId)]);
  const rent = home ? (home.contractType === "jeonse" ? 0 : home.monthlyRent) : null;
  const mine = home && rent !== null ? { ...home, monthlyRent: rent } : null;
  const now = new Date();
  const month = kstMonth(now);
  // spec 011 FR-002: 사용량을 모르면 시군구 평균으로 추정
  const basis = await loadEstimateBasis(mine ? [...homes, mine] : homes, now);
  const cost = (target: Parameters<typeof withEstimate>[0] & Parameters<typeof realCost>[0]) => realCost(withEstimate(target, basis.averages, basis.aptAverages), month);
  return {
    mine: mine ? { housingType: mine.housingType, exclusiveAreaM2: mine.exclusiveAreaM2, cost: cost(mine) } : null,
    homes: homes.map((h) => ({ id: h.id, name: h.name, housingType: h.housingType, exclusiveAreaM2: h.exclusiveAreaM2, cost: cost(h), input: toInput(h) })),
  };
}
