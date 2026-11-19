import { homeUsage, type HomeUsage } from "@/incident/energy-estimate";
import { loadEstimateBasis, type EstimateBasis } from "@/incident/energy-estimate.server";
import { loadMyHome } from "../my/home/load";

export type EnergyLoaded = { hasHome: false } | { hasHome: true; usage: HomeUsage | null; basis: EstimateBasis };

// spec 011 FR-003: 내 집 기준 한 달 사용량. 에너지비(원)만 넣은 집도 사용량은 모르므로 추정한다
export async function loadEnergyUsage(userId: string, now: Date): Promise<EnergyLoaded> {
  const { home } = await loadMyHome(userId);
  if (!home) return { hasHome: false };
  const basis = home.electricityKwh === null
    ? await loadEstimateBasis([{ ...home, energyCost: null }], now)
    : { averages: new Map(), failed: 0 };
  const usage = homeUsage({ electricityKwh: home.electricityKwh, estimatedKwh: basis.averages.get(home.sigunguCode)?.kwh ?? null });
  return { hasHome: true, usage, basis };
}
