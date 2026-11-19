import { withEstimate } from "@/incident/energy-estimate";
import { loadEstimateBasis, type EstimateBasis } from "@/incident/energy-estimate.server";
import { listMyInterestHomes } from "@/incident/interest-homes.server";
import { compareRealCosts, type CompareRow, type CostInput } from "@/incident/real-cost";
import { loadMyHome } from "../my/home/load";
import { kstMonth } from "./cost-view";

export type LoadedCompare = { rows: CompareRow[]; hasMine: boolean; empty: boolean; basis: EstimateBasis };

/** 실질 비용 비교(spec 009 FR-005)와 추천 결과(spec 015)가 같이 쓰는 불러오기. 읽기 실패는 던진다 */
export async function loadCompare(userId: string): Promise<LoadedCompare> {
  const [{ home }, homes] = await Promise.all([loadMyHome(userId), listMyInterestHomes(userId)]);
  // E7: 내 집이 없거나 월세(계약)가 없으면 내 집 줄을 넣지 않는다
  const mine = home && home.monthlyRent !== null ? { ...home, monthlyRent: home.monthlyRent } : null;
  // spec 011 FR-002: 내 집과 관심 주택 모두 사용량을 모르면 시군구 평균으로 추정
  const now = new Date();
  const basis = await loadEstimateBasis(mine ? [...homes, mine] : homes, now);
  const myHome: CostInput | null = mine ? withEstimate(mine, basis.averages, basis.aptAverages) : null;
  const others = homes.map((h) => withEstimate(h, basis.averages, basis.aptAverages));
  return { rows: compareRealCosts({ myHome, homes: others, month: kstMonth(now) }), hasMine: mine !== null, empty: homes.length === 0 && !mine, basis };
}
