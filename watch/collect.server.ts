import { planChangeIncidents } from "@/incident/detect";
import { insertIncidents, loadConditionOwners, loadExistingKeys } from "@/incident/create.server";
import { findNoticeChanges } from "@/incident/notice-change";
import { draftPlans, insertPlans } from "@/incident/plans.server";
import { newCallContext } from "@/lib/llm/call.server";
import type { AdminClient } from "@/lib/supabase/admin";
import { toKstDate } from "@/watch/kst";
import { maskSecrets } from "@/watch/mask";
import { fetchAllMyhomeNotices, type PageFetcher } from "@/watch/myhome.server";
import { finishRun, recordStep, startRun, type RunTrigger } from "@/watch/run-log.server";
import { saveSourceItems, type SavedItems } from "@/watch/source-items.server";
import type { Notice } from "@/watch/notice";

export const MYHOME_SOURCE = "myhome_notice";

export type CollectSummary = {
  runId: string;
  status: "succeeded" | "failed";
  notices: number;
  newIncidents: number;
  updatedIncidents: number;
  error?: string;
};

type CollectInput = { db: AdminClient; fetchPage: PageFetcher; trigger: RunTrigger; now: Date };

// 오류 메시지에서 가릴 키들 (FR-004, PRD FR-27)
function secretsToMask(): string[] {
  return [
    process.env.DATA_GO_KR_SERVICE_KEY ?? "", process.env.SUPABASE_SECRET_KEY ?? "",
    process.env.GEMINI_API_KEY ?? "", process.env.ANTHROPIC_API_KEY ?? "", // spec 002 FR-008
  ];
}

async function saveObservations(db: AdminClient, runId: string, notices: Notice[], saved: SavedItems, isSimulated: boolean) {
  if (notices.length === 0) return;
  const observedAt = new Date().toISOString();
  const rows = notices.map((notice) => {
    const id = saved.idByExternalId.get(notice.externalId) ?? null;
    const changed = id === null || saved.newIds.has(id) ? null : saved.changedIds.has(id) ? 1 : 0;
    return {
      run_id: runId, source_code: MYHOME_SOURCE, observed_at: observedAt, target: notice.externalId,
      metric: "notice", value_text: notice.title, value_numeric: notice.monthlyRent,
      change_amount: changed, source_item_id: id, is_simulated: isSimulated,
    };
  });
  const { error } = await db.from("observations").insert(rows);
  if (error) throw new Error(`모은 값을 저장하지 못했습니다: ${error.message}`);
}

async function runSteps(input: CollectInput, runId: string): Promise<Omit<CollectSummary, "runId" | "status">> {
  const { db, fetchPage, trigger, now } = input;
  const isSimulated = trigger === "simulation";
  const collected = await fetchAllMyhomeNotices(fetchPage);
  await recordStep(db, runId, { name: "collect", status: "succeeded", itemsIn: collected.rawCount, itemsOut: collected.notices.length, detail: { skipped: collected.skipped, duplicates: collected.duplicates } });

  const saved = await saveSourceItems(db, MYHOME_SOURCE, collected.notices);
  await saveObservations(db, runId, collected.notices, saved, isSimulated);
  await recordStep(db, runId, { name: "compare", status: "succeeded", itemsIn: collected.notices.length, itemsOut: saved.newIds.size + saved.changedIds.size, detail: { new: saved.newIds.size, changed: saved.changedIds.size } });

  // FR-005, FR-006, FR-016 (spec 001 v0.2): 처음 보인 공고는 맞는 공고일 뿐, 변화만 사건이 된다
  const today = toKstDate(now);
  const changes = findNoticeChanges({ notices: collected.notices, ...saved, today });
  const planned = planChangeIncidents({
    changes, owners: await loadConditionOwners(db), existingKeys: await loadExistingKeys(db), today, sourceCode: MYHOME_SOURCE,
  });
  // spec 002 FR-006: 한 번 수집의 AI 호출 상한·대기 예산
  const drafts = await draftPlans(db, planned.map((plan) => plan.facts), newCallContext(runId));
  const created = await insertIncidents({ db, planned, runId, sourceItemIds: saved.idByExternalId, isSimulated });
  const plans = await insertPlans(db, created, drafts);
  const newIncidents = created.length;
  // CollectSummary.updatedIncidents: v0.2부터는 "변화가 생긴 공고 수"(사건 수와 다를 수 있음)
  const updatedIncidents = changes.length;
  const byKind = Object.fromEntries(["changed", "correction", "relaxed"].map((kind) => [kind, changes.filter((c) => c.kind === kind).length]));
  await recordStep(db, runId, { name: "detect", status: "succeeded", itemsIn: collected.notices.length, itemsOut: newIncidents, detail: { changes: byKind } });
  await recordStep(db, runId, { name: "draft_plan", status: newIncidents ? "succeeded" : "skipped", itemsIn: newIncidents, itemsOut: newIncidents, detail: { ai_provider: process.env.AI_PROVIDER || "(비어 있음)", ai_drafted: plans.drafted, ai_failed: plans.failed, ai_skipped_by_limit: plans.skipped, ai_failure_reasons: plans.failureReasons } });
  await recordStep(db, runId, { name: "await_approval", status: newIncidents ? "waiting" : "skipped", itemsOut: newIncidents });
  return { notices: collected.notices.length, newIncidents, updatedIncidents };
}

/**
 * FR-003~006 (spec 001): 마이홈 수집 한 번. 실패해도 "변화 없음"으로 끝내지 않고 실행 기록을 실패로 남긴다.
 */
export async function collectMyhome(input: CollectInput): Promise<CollectSummary> {
  const runId = await startRun(input.db, MYHOME_SOURCE, input.trigger);
  try {
    const result = await runSteps(input, runId);
    await finishRun(input.db, runId, null);
    return { runId, status: "succeeded", ...result };
  } catch (cause) {
    const message = maskSecrets(cause instanceof Error ? cause.message : String(cause), secretsToMask());
    // 실패 단계 기록이 또 실패해도 아래 finishRun으로 실행 기록은 "실패"로 남긴다. 그 오류만 버린다
    await recordStep(input.db, runId, { name: "collect", status: "failed", detail: { error: message } }).catch(() => undefined);
    await finishRun(input.db, runId, message);
    return { runId, status: "failed", notices: 0, newIncidents: 0, updatedIncidents: 0, error: message };
  }
}
