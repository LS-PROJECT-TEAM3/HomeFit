import { notifyIncidents } from "@/incident/notify.server";
import type { DraftResult } from "@/incident/plan-draft.server";
import { planRentIncidents, rentTargetKeys, type AreaTarget, type HomeTarget, type RentFacts, type RentPlan } from "@/incident/rent-detect";
import { draftRentPlan } from "@/incident/rent-plan.server";
import { insertRentIncidents, insertRentPlans, loadRentTargets, updateAreaMedians, type CreatedRentIncident } from "@/incident/rent.server";
import { newCallContext } from "@/lib/llm/call.server";
import type { AdminClient } from "@/lib/supabase/admin";
import { toKstDate } from "@/watch/kst";
import { maskSecrets } from "@/watch/mask";
import { recentDealMonths } from "@/watch/rtms";
import { fetchTrades, type RtmsFetcher } from "@/watch/rtms.server";
import { finishRun, recordStep, startRun, type RunTrigger } from "@/watch/run-log.server";
import { onlyVirtualWhenSimulating, parseVirtualUserIds } from "@/watch/simulation";

// spec 008 FR-002·004·005·007 (PRD FR-09, FR-12): 전월세 실거래가 수집 한 번. 다른 수집과 같은 실행 기록 모양
export const RTMS_SOURCE = "rtms_trade";

export type RentSummaryResult = { runId: string; status: "succeeded" | "failed"; targets: number; trades: number; newIncidents: number; error?: string };

type Targets = { homes: HomeTarget[]; areas: AreaTarget[] };
/** 시뮬레이터는 가상 계정의 대상에 맞춘 가짜 거래를 만들어야 해서 대상을 받아 fetcher를 만든다 */
type CollectInput = { db: AdminClient; makeFetcher: (targets: Targets, firstMonth: string) => RtmsFetcher; trigger: RunTrigger; now: Date };

function secretsToMask(): string[] {
  return [
    process.env.DATA_GO_KR_SERVICE_KEY ?? "", process.env.SUPABASE_SECRET_KEY ?? "",
    process.env.GEMINI_API_KEY ?? "", process.env.ANTHROPIC_API_KEY ?? "", process.env.SLACK_BOT_TOKEN ?? "",
  ];
}

const mask = (text: string) => maskSecrets(text, secretsToMask());
const dashed = (ym: string) => `${ym.slice(0, 4)}-${ym.slice(4, 6)}`;

async function loadTargets(db: AdminClient, trigger: RunTrigger): Promise<Targets> {
  const all = await loadRentTargets(db);
  // 사용자 결정(2026-11-18): 시뮬레이션은 가상 계정에만
  const virtual = parseVirtualUserIds(process.env.SIMULATION_USER_IDS);
  return { homes: onlyVirtualWhenSimulating(all.homes, trigger, virtual), areas: onlyVirtualWhenSimulating(all.areas, trigger, virtual) };
}

async function saveObservations(db: AdminClient, runId: string, plan: RentPlan, isSimulated: boolean): Promise<void> {
  const observedAt = new Date().toISOString();
  const rows = plan.observed.flatMap((o) => ([["median_rent", o.medianRent], ["median_deposit", o.medianDeposit], ["trade_count", o.count]] as const)
    .filter(([, value]) => value !== null)
    .map(([metric, value]) => ({ run_id: runId, source_code: RTMS_SOURCE, observed_at: observedAt, target: o.target, metric, value_numeric: value, value_text: o.enough ? null : "거래 부족", is_simulated: isSimulated })));
  if (rows.length === 0) return;
  const { error } = await db.from("observations").insert(rows);
  if (error) throw new Error(`모은 값을 저장하지 못했습니다: ${error.message}`);
}

async function runNotify(db: AdminClient, runId: string, created: CreatedRentIncident[]) {
  try {
    const stats = await notifyIncidents(db, created.map((c) => ({ incidentId: c.id, userId: c.user_id, detectedAt: c.detected_at, facts: c.facts as unknown as RentFacts })));
    await recordStep(db, runId, { name: "notify", status: stats.sent + stats.failed === 0 ? "skipped" : "succeeded", itemsIn: created.length, itemsOut: stats.sent, detail: stats });
  } catch (cause) {
    await recordStep(db, runId, { name: "notify", status: "failed", detail: { error: mask(cause instanceof Error ? cause.message : String(cause)) } });
  }
}

async function runSteps(input: CollectInput, runId: string): Promise<Omit<RentSummaryResult, "runId" | "status"> & { failedKeys: number }> {
  const { db, trigger, now } = input;
  const isSimulated = trigger === "simulation";
  const targets = await loadTargets(db, trigger);
  const keys = rentTargetKeys(targets.homes, targets.areas);
  if (keys.length === 0) {
    await recordStep(db, runId, { name: "collect", status: "skipped", itemsIn: 0, itemsOut: 0, detail: { reason: "비교할 내 집·관심 지역 없음" } });
    return { targets: 0, trades: 0, newIncidents: 0, failedKeys: 0 };
  }
  const months = recentDealMonths(toKstDate(now));
  const collected = await fetchTrades(input.makeFetcher(targets, months[0]), keys, months);
  const failed = collected.failed.map((f) => ({ key: f.key, reason: mask(f.reason) }));
  await recordStep(db, runId, { name: "collect", status: collected.okKeys.length ? "succeeded" : "failed", itemsIn: keys.length, itemsOut: collected.trades.length, detail: { months, ok: collected.okKeys, failed } });
  if (collected.okKeys.length === 0) throw new Error(`실거래가를 하나도 읽지 못했습니다: ${failed[0]?.reason ?? "이유 없음"}`);

  // E7: 실패한 시군구·유형의 대상은 이번에 판단하지 않는다(거래 0건으로 오판하지 않게)
  const ok = new Set(collected.okKeys);
  const keep = <T extends { sigunguCode: string; housingType: string }>(list: T[]) => list.filter((t) => ok.has(`${t.sigunguCode}:${t.housingType}`));
  const plan = planRentIncidents({
    homes: keep(targets.homes), areas: keep(targets.areas), trades: collected.trades,
    runYm: toKstDate(now).slice(0, 7), months: [dashed(months[months.length - 1]), dashed(months[0])],
  });
  await saveObservations(db, runId, plan, isSimulated);
  await recordStep(db, runId, { name: "compare", status: "succeeded", itemsIn: collected.trades.length, itemsOut: plan.observed.length, detail: { enough: plan.observed.filter((o) => o.enough).length, too_few: plan.observed.filter((o) => !o.enough).length } });

  // spec 002 FR-006: 느린 AI 호출은 알림을 저장하기 **전에** 끝낸다
  const drafts = new Map<string, DraftResult>();
  const ctx = newCallContext(runId);
  for (const planned of plan.create) drafts.set(planned.dedupKey, await draftRentPlan(db, planned.facts, ctx));
  const created = await insertRentIncidents(db, { planned: plan.create, runId, isSimulated });
  const stats = await insertRentPlans(db, created, drafts);
  await updateAreaMedians(db, plan.areaUpdates);
  await recordStep(db, runId, { name: "detect", status: "succeeded", itemsIn: plan.observed.length, itemsOut: created.length, detail: { planned: plan.create.length, created: created.length, area_updates: plan.areaUpdates.length } });
  await recordStep(db, runId, {
    name: "draft_plan", status: created.length ? "succeeded" : "skipped", itemsIn: created.length, itemsOut: created.length,
    detail: { ai_provider: process.env.AI_PROVIDER || "(비어 있음)", ai_drafted: stats.drafted, ai_failed: stats.failed, ai_skipped_by_limit: stats.skipped, ai_failure_reasons: stats.failureReasons },
  });
  await runNotify(db, runId, created);
  await recordStep(db, runId, { name: "await_approval", status: created.length ? "waiting" : "skipped", itemsOut: created.length });
  return { targets: plan.observed.length, trades: collected.trades.length, newIncidents: created.length, failedKeys: failed.length };
}

/** 실패해도 "변화 없음"으로 끝내지 않는다. 일부 유형만 실패해도 실행은 수집 오류로 남긴다(E7) */
export async function collectRent(input: CollectInput): Promise<RentSummaryResult> {
  const runId = await startRun(input.db, RTMS_SOURCE, input.trigger);
  try {
    const { failedKeys, ...result } = await runSteps(input, runId);
    const error = failedKeys ? `시군구·유형 ${failedKeys}곳을 읽지 못했습니다(나머지는 판단함)` : null;
    await finishRun(input.db, runId, error);
    return { runId, status: error ? "failed" : "succeeded", ...result, ...(error ? { error } : {}) };
  } catch (cause) {
    const message = mask(cause instanceof Error ? cause.message : String(cause));
    await recordStep(input.db, runId, { name: "collect", status: "failed", detail: { error: message } }).catch(() => undefined);
    await finishRun(input.db, runId, message);
    return { runId, status: "failed", targets: 0, trades: 0, newIncidents: 0, error: message };
  }
}
