import type { TargetGroup } from "@/incident/match";
import type { ConditionOwner, PlannedIncident } from "@/incident/detect";
import type { CreatedIncident } from "@/incident/plans.server";
import type { AdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

/** 조건을 넣은 모든 사용자 (FR-005). 수집은 사용자 없이 돌아 secret 키로 읽는다 */
export async function loadConditionOwners(db: AdminClient): Promise<ConditionOwner[]> {
  const { data, error } = await db
    .from("policy_conditions")
    .select("user_id, sido_code, sigungu_code, supply_types, max_monthly_rent, age, target_groups");
  if (error) throw new Error(`사용자 조건을 읽지 못했습니다: ${error.message}`);
  return data.map((row) => ({
    userId: row.user_id,
    condition: {
      sidoCode: row.sido_code,
      sigunguCode: row.sigungu_code,
      supplyTypes: row.supply_types,
      targetGroups: row.target_groups as TargetGroup[],
      maxMonthlyRent: row.max_monthly_rent,
      age: row.age,
    },
  }));
}

/** 이미 있는 공고 사건 "userId|dedupKey" (FR-006) */
export async function loadExistingKeys(db: AdminClient): Promise<Set<string>> {
  const { data, error } = await db
    .from("incidents")
    .select("user_id, dedup_key")
    .eq("incident_type", "housing_support");
  if (error) throw new Error(`기존 사건을 읽지 못했습니다: ${error.message}`);
  return new Set(data.map((row) => `${row.user_id}|${row.dedup_key}`));
}

type InsertInput = {
  db: AdminClient;
  planned: PlannedIncident[];
  runId: string;
  sourceItemIds: Map<string, string>;
  isSimulated: boolean;
};

/**
 * FR-005 (spec 001): 사건을 만들고 새로 생긴 행을 돌려준다(계획은 incident/plans.server.ts).
 * 같은 키가 동시에 들어오면 DB 유일 조건이 막고 건너뛴다(Vercel이 같은 실행을 두 번 보낼 수 있음).
 */
export async function insertIncidents({ db, planned, runId, sourceItemIds, isSimulated }: InsertInput): Promise<CreatedIncident[]> {
  if (planned.length === 0) return [];
  const rows = planned.map((plan) => ({
    user_id: plan.userId,
    incident_type: "housing_support",
    target_kind: "condition",
    source_item_id: sourceItemIds.get(plan.externalId) ?? null,
    run_id: runId,
    dedup_key: plan.dedupKey,
    facts: plan.facts as unknown as Json, // IncidentFacts는 JSON으로 바꿀 수 있는 값만 가진다
    is_simulated: isSimulated,
  }));
  const { data, error } = await db
    .from("incidents")
    .upsert(rows, { onConflict: "user_id,dedup_key", ignoreDuplicates: true })
    .select("id, facts, user_id, detected_at");
  if (error) throw new Error(`사건을 만들지 못했습니다: ${error.message}`);
  return data;
}
