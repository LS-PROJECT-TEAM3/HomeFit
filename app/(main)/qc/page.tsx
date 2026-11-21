import { connection } from "next/server";
import { Suspense } from "react";
import { Loading } from "@/app/_components/states";
import type { WindowType } from "@/incident/condensation";
import { currentUserId } from "@/lib/supabase/server";
import { gridForSigungu } from "@/watch/kma-grid";
import { cachedNowWeather, weatherSlot } from "@/watch/kma-now.server";
import { loadMyHome } from "../my/home/load";
import { CondensationSimulator, type SimStart } from "./simulator";

export const metadata = { title: "결로 위험 | 집 점검 | HomeFit AI" };

// 내 집·측정값·날씨가 없거나 못 읽으면 쓰는 시작 값(예전 시뮬레이터 기본값)
const FALLBACK: SimStart = { indoor: 20, humidity: 60, outdoor: -5, windowType: "single" };

/** 현경 결정(2026-11-21): 내 집 최근 측정값·창 종류와 기상청 지금 기온으로 시작. 하나라도 못 읽으면 그 칸만 기본값 */
async function startValues(): Promise<SimStart> {
  await connection();
  const userId = await currentUserId();
  if (!userId) return FALLBACK;
  try {
    const { home, measurements } = await loadMyHome(userId);
    if (!home) return FALLBACK;
    const latest = measurements[0];
    const grid = gridForSigungu(home.sigunguCode);
    const outdoor = grid ? await cachedNowWeather(grid.nx, grid.ny, weatherSlot(new Date())).then((w) => w.temperature).catch(() => null) : null;
    return {
      indoor: latest?.temperatureC ?? FALLBACK.indoor, humidity: latest?.humidityPct ?? FALLBACK.humidity,
      outdoor: outdoor ?? FALLBACK.outdoor, windowType: home.windowType as WindowType,
    };
  } catch {
    return FALLBACK; // 시작 값만 기본값으로. 계산은 그대로 된다
  }
}

async function Simulator() {
  return <CondensationSimulator start={await startValues()} />;
}

// IA QC_100000_PG 결로 위험 (spec 004 FR-003, spec 022 FR-011, 캔버스 v2-qc-sim-tab-pc): 기능 003 계산을 그대로 씀, 저장 안 함
export default function QcSimulatorPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Simulator />
    </Suspense>
  );
}
