import type { AdminClient } from "@/lib/supabase/admin";
import { maskSecrets } from "@/watch/mask";
import { finishRun, recordStep, startRun, type RunTrigger } from "@/watch/run-log.server";
import { commitSourceItems, saveSourceItems } from "@/watch/source-items.server";
import { fetchAllYouthPolicies, type PolicyPageFetcher } from "@/watch/youth-policy.server";

export const YOUTH_SOURCE = "youth_policy";

export type YouthCollectSummary = { runId: string; status: "succeeded" | "failed"; policies: number; newPolicies: number; changedPolicies: number; error?: string };

type CollectInput = { db: AdminClient; fetchPage: PolicyPageFetcher; trigger: RunTrigger };

function secretsToMask(): string[] {
  return [process.env.YOUTH_POLICY_API_KEY ?? "", process.env.SUPABASE_SECRET_KEY ?? ""];
}

async function runSteps({ db, fetchPage, trigger }: CollectInput, runId: string) {
  const collected = await fetchAllYouthPolicies(fetchPage);
  await recordStep(db, runId, { name: "collect", status: "succeeded", itemsIn: collected.rawCount, itemsOut: collected.policies.length, detail: { skipped: collected.skipped, duplicates: collected.duplicates } });

  const saved = await saveSourceItems(db, YOUTH_SOURCE, collected.policies);
  // 정책은 사건을 만들지 않아(spec 006 Q1) 미룰 이유가 없다. 바로 새 값을 쓴다
  await commitSourceItems(db, saved);
  const observedAt = new Date().toISOString();
  const rows = collected.policies.map((policy) => {
    const id = saved.idByExternalId.get(policy.externalId) ?? null;
    const changed = id === null || saved.newIds.has(id) ? null : saved.changedIds.has(id) ? 1 : 0;
    return { run_id: runId, source_code: YOUTH_SOURCE, observed_at: observedAt, target: policy.externalId, metric: "policy", value_text: policy.title, value_numeric: null, change_amount: changed, source_item_id: id, is_simulated: trigger === "simulation" };
  });
  if (rows.length) {
    const { error } = await db.from("observations").insert(rows);
    if (error) throw new Error(`모은 값을 저장하지 못했습니다: ${error.message}`);
  }
  await recordStep(db, runId, { name: "compare", status: "succeeded", itemsIn: collected.policies.length, itemsOut: saved.newIds.size + saved.changedIds.size, detail: { new: saved.newIds.size, changed: saved.changedIds.size } });
  await recordStep(db, runId, { name: "detect", status: "skipped", itemsIn: collected.policies.length, itemsOut: 0, detail: { reason: "정책 변화 알림은 아직 만들지 않음 (spec 006 Q1)" } });
  return { policies: collected.policies.length, newPolicies: saved.newIds.size, changedPolicies: saved.changedIds.size };
}

/** spec 006 FR-001·002 (PRD FR-07): 온통청년 주거 정책 수집 한 번. 실패해도 "변화 없음"이 아니라 실패로 남긴다 */
export async function collectYouthPolicies(input: CollectInput): Promise<YouthCollectSummary> {
  const runId = await startRun(input.db, YOUTH_SOURCE, input.trigger);
  try {
    const result = await runSteps(input, runId);
    await finishRun(input.db, runId, null);
    return { runId, status: "succeeded", ...result };
  } catch (cause) {
    const message = maskSecrets(cause instanceof Error ? cause.message : String(cause), secretsToMask());
    await recordStep(input.db, runId, { name: "collect", status: "failed", detail: { error: message } }).catch(() => undefined);
    await finishRun(input.db, runId, message);
    return { runId, status: "failed", policies: 0, newPolicies: 0, changedPolicies: 0, error: message };
  }
}
