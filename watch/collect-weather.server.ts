import { planHumidityIncidents } from "@/incident/humidity-detect";
import type { HumidityFacts } from "@/incident/humidity-detect";
import { draftHumidityPlan } from "@/incident/humidity-plan.server";
import { notifyStepStatus } from "@/incident/notify";
import { notifyAllChannels } from "@/incident/notify.server";
import type { CreatedIncident } from "@/incident/plans.server";
import type { DraftResult } from "@/incident/plan-draft.server";
import { newCallContext } from "@/lib/llm/call.server";
import {
  insertHumidityIncidents, insertHumidityPlans, loadHomesForCheck, loadRecentHumidityIncidents, updateHumidityIncidents,
} from "@/incident/humidity.server";
import type { AdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import type { ForecastFetcher } from "@/watch/kma.server";
import { maskSecrets } from "@/watch/mask";
import { onlyVirtualWhenSimulating, parseVirtualUserIds } from "@/watch/simulation";
import { finishRun, recordStep, startRun, type RunTrigger } from "@/watch/run-log.server";
import { collectForecasts, type Collected } from "@/watch/weather-collect";

// FR-003~005 (spec 003): 기상청 예보 수집 한 번. 기능 001 수집과 같은 실행 기록 모양(runs·run_steps)
export const KMA_SOURCE = "kma_forecast";

export type WeatherSummary = {
  runId: string;
  status: "succeeded" | "failed";
  sigungu: number;
  newIncidents: number;
  updatedIncidents: number;
  error?: string;
};

type CollectInput = { db: AdminClient; fetchForecast: ForecastFetcher; trigger: RunTrigger; now: Date };

function secretsToMask(): string[] {
  return [
    process.env.DATA_GO_KR_SERVICE_KEY ?? "", process.env.SUPABASE_SECRET_KEY ?? "",
    process.env.GEMINI_API_KEY ?? "", process.env.ANTHROPIC_API_KEY ?? "", // spec 002 FR-008: AI 오류 문구에 키가 섞여도 가린다
    process.env.SLACK_BOT_TOKEN ?? "",
  ];
}

/**
 * ERD observations "같은 모양": 예보 시각마다 기온·습도·강수 형태.
 * shortcut: 회차마다 시군구 × 약 60시간 × 3항목을 쌓는다(시군구 30곳이면 회차당 5,400행, 1년 약 400만 행).
 * 팀 과제 규모에서는 괜찮다. 사용자가 늘면 48시간치만 저장하거나 오래된 예보를 지운다 (3단계 리뷰 4)
 */
async function saveObservations(db: AdminClient, runId: string, collected: Collected, isSimulated: boolean): Promise<number> {
  const raw = { baseDate: collected.base.baseDate, baseTime: collected.base.baseTime } as Json;
  const rows = [...collected.bySigungu].flatMap(([sigunguCode, hours]) =>
    hours.flatMap((hour) =>
      ([["temperature", hour.temperature], ["humidity", hour.humidity], ["precipitation_type", hour.precipitationType]] as const)
        .filter(([, value]) => value !== null)
        .map(([metric, value]) => ({
          run_id: runId, source_code: KMA_SOURCE, observed_at: hour.forecastAt, target: sigunguCode,
          metric, value_numeric: value, raw, is_simulated: isSimulated,
        })),
    ),
  );
  if (rows.length === 0) return 0;
  const { error } = await db.from("observations").insert(rows);
  if (error) throw new Error(`예보 값을 저장하지 못했습니다: ${error.message}`);
  return rows.length;
}

/**
 * spec 003 FR-009: 새 습도·결로 알림을 슬랙으로(켠 사람만). 실패해도 수집은 성공으로 끝내고 실행 기록에만 남긴다.
 * 갱신된 알림은 다시 보내지 않는다(알림 기록이 알림마다 한 번, ERD notifications 유일 조건)
 */
async function runNotifyStep(db: AdminClient, runId: string, created: CreatedIncident[]) {
  try {
    const candidates = created.map((c) => ({ incidentId: c.id, userId: c.user_id, detectedAt: c.detected_at, facts: c.facts as unknown as HumidityFacts }));
    const stats = await notifyAllChannels(db, candidates);
    const status = notifyStepStatus(stats);
    await recordStep(db, runId, { name: "notify", status, itemsIn: created.length, itemsOut: stats.sent, detail: stats });
  } catch (cause) {
    const message = maskSecrets(cause instanceof Error ? cause.message : String(cause), secretsToMask());
    await recordStep(db, runId, { name: "notify", status: "failed", detail: { error: message } });
  }
}

// 실패 이유에 키가 섞일 수 있어 가린다 (PRD FR-27)
function maskFailures(failed: Collected["failed"]): Json {
  return failed.map((item) => ({ sigungu: item.sigunguCode, reason: maskSecrets(item.reason, secretsToMask()) }));
}

async function runSteps(input: CollectInput, runId: string): Promise<Omit<WeatherSummary, "runId" | "status">> {
  const { db, fetchForecast, trigger, now } = input;
  const isSimulated = trigger === "simulation";
  // 사용자 결정(2026-11-18): 시뮬레이션(가짜 예보)은 가상 계정의 집에만
  const homes = onlyVirtualWhenSimulating(await loadHomesForCheck(db, now), trigger, parseVirtualUserIds(process.env.SIMULATION_USER_IDS));
  if (homes.length === 0) {
    await recordStep(db, runId, { name: "collect", status: "skipped", itemsIn: 0, itemsOut: 0, detail: { reason: "읽을 집 없음" } });
    return { sigungu: 0, newIncidents: 0, updatedIncidents: 0 };
  }
  const collected = await collectForecasts(homes.map((home) => home.sigunguCode), fetchForecast, now);
  await recordStep(db, runId, {
    name: "collect", status: "succeeded", itemsIn: homes.length, itemsOut: collected.bySigungu.size,
    detail: {
      base: `${collected.base.baseDate} ${collected.base.baseTime}`, representative_grid: collected.fallback, unknown_sigungu: collected.unknown,
      failed_sigungu: maskFailures(collected.failed),
    },
  });
  const saved = await saveObservations(db, runId, collected, isSimulated);
  await recordStep(db, runId, { name: "compare", status: "succeeded", itemsIn: collected.bySigungu.size, itemsOut: saved });

  const plan = planHumidityIncidents({ homes, forecastBySigungu: collected.bySigungu, openIncidents: await loadRecentHumidityIncidents(db, now), now });
  // spec 002 FR-006, spec 001 리뷰: 느린 AI 호출은 사건을 저장하기 **전에** 끝낸다(시간 제한에 걸려도 계획 없는 사건이 남지 않게)
  const drafts = new Map<string, DraftResult>();
  const ctx = newCallContext(runId);
  for (const planned of plan.create) drafts.set(planned.dedupKey, await draftHumidityPlan(db, planned.facts, ctx));
  const created = await insertHumidityIncidents(db, { planned: plan.create, runId, isSimulated });
  const updated = await updateHumidityIncidents(db, plan.update);
  await recordStep(db, runId, { name: "detect", status: "succeeded", itemsIn: homes.length, itemsOut: created.length + updated.length, detail: { created: created.length, updated: updated.length, ...plan.counts } });
  const stats = await insertHumidityPlans(db, created, drafts);
  await recordStep(db, runId, {
    name: "draft_plan", status: created.length ? "succeeded" : "skipped", itemsIn: created.length, itemsOut: created.length,
    detail: { ai_provider: process.env.AI_PROVIDER || "(비어 있음)", ai_drafted: stats.drafted, ai_failed: stats.failed, ai_skipped_by_limit: stats.skipped, ai_failure_reasons: stats.failureReasons },
  });
  await runNotifyStep(db, runId, created);
  const waiting = created.length + updated.length;
  await recordStep(db, runId, { name: "await_approval", status: waiting ? "waiting" : "skipped", itemsOut: waiting });
  return { sigungu: collected.bySigungu.size, newIncidents: created.length, updatedIncidents: updated.length };
}

/** 실패해도 "변화 없음"으로 끝내지 않고 실행 기록을 실패로 남긴다(CLAUDE.md 팀 규칙) */
export async function collectWeather(input: CollectInput): Promise<WeatherSummary> {
  const runId = await startRun(input.db, KMA_SOURCE, input.trigger);
  try {
    const result = await runSteps(input, runId);
    await finishRun(input.db, runId, null);
    return { runId, status: "succeeded", ...result };
  } catch (cause) {
    const message = maskSecrets(cause instanceof Error ? cause.message : String(cause), secretsToMask());
    await recordStep(input.db, runId, { name: "collect", status: "failed", detail: { error: message } }).catch(() => undefined);
    await finishRun(input.db, runId, message);
    return { runId, status: "failed", sigungu: 0, newIncidents: 0, updatedIncidents: 0, error: message };
  }
}
