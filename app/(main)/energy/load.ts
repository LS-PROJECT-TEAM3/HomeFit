import { homeUsage, withEstimate, type HomeUsage } from "@/incident/energy-estimate";
import { loadEstimateBasis, type EstimateBasis } from "@/incident/energy-estimate.server";
import { loadMyHome } from "../my/home/load";

export type EnergyLoaded = { hasHome: false } | { hasHome: true; usage: HomeUsage | null; basis: EstimateBasis };

// spec 011 FR-003, spec 017: 내 집 기준 한 달 사용량. 에너지비(원)만 넣은 집도 사용량은 모르므로 추정한다
export async function loadEnergyUsage(userId: string, now: Date): Promise<EnergyLoaded> {
  const { home } = await loadMyHome(userId);
  if (!home) return { hasHome: false };
  const basis = home.electricityKwh === null
    ? await loadEstimateBasis([{ ...home, energyCost: null }], now)
    : { averages: new Map(), failed: 0, requested: 0, aptAverages: new Map(), aptFailed: 0 };
  // spec 017 FR-002: 한전 시군구 평균(없으면 패널 전국 평균) × 주택 종류·면적 비율
  const usage = homeUsage({ electricityKwh: home.electricityKwh, estimatedKwh: withEstimate(home, basis.averages).estimatedKwh });
  return { hasHome: true, usage, basis };
}
