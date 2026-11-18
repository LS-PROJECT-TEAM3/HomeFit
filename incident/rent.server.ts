import type { ContractType, HousingType } from "@/incident/home-form";
import type { DraftResult } from "@/incident/plan-draft.server";
import type { CreatedIncident, PlanStats } from "@/incident/plans.server";
import type { AreaTarget, AreaUpdate, HomeTarget, PlannedRentIncident, RentFacts } from "@/incident/rent-detect";
import { defaultRentChecklist } from "@/incident/rent-plan";
import type { AdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

// spec 008 FR-004~006: 시세 알림에 필요한 DB 읽기·쓰기. 수집은 사용자 없이 돌아 secret 키로 쓴다
const RENT = "rent_price_change";

export async function loadRentTargets(db: AdminClient): Promise<{ homes: HomeTarget[]; areas: AreaTarget[] }> {
  const [homes, areas] = await Promise.all([
    db.from("homes").select("id, user_id, sigungu_code, housing_type, exclusive_area_m2, contract_type, deposit, monthly_rent, contract_end_date"),
    db.from("interest_areas").select("id, user_id, sigungu_code, housing_type, target_area_m2, contract_type, last_median_value, last_median_deposit"),
  ]);
  if (homes.error) throw new Error(`내 집을 읽지 못했습니다: ${homes.error.message}`);
  if (areas.error) throw new Error(`관심 지역을 읽지 못했습니다: ${areas.error.message}`);
  return {
    homes: homes.data.map((h) => ({
      homeId: h.id, userId: h.user_id, sigunguCode: h.sigungu_code, housingType: h.housing_type as HousingType, areaM2: Number(h.exclusive_area_m2),
      contractType: h.contract_type as ContractType | null, deposit: h.deposit, monthlyRent: h.monthly_rent, contractEndDate: h.contract_end_date,
    })),
    areas: areas.data.map((a) => ({
      areaId: a.id, userId: a.user_id, sigunguCode: a.sigungu_code, housingType: a.housing_type as HousingType, areaM2: Number(a.target_area_m2),
      contractType: a.contract_type as ContractType, lastMedianRent: a.last_median_value, lastMedianDeposit: a.last_median_deposit === null ? null : Number(a.last_median_deposit),
    })),
  };
}

export type CreatedRentIncident = CreatedIncident & { dedup_key: string };

/** E6: 같은 대상·같은 달이 다시 오면 DB 유일 조건(user_id, dedup_key)이 막고 건너뛴다 */
export async function insertRentIncidents(db: AdminClient, input: { planned: PlannedRentIncident[]; runId: string; isSimulated: boolean }): Promise<CreatedRentIncident[]> {
  if (input.planned.length === 0) return [];
  const rows = input.planned.map((p) => ({
    user_id: p.userId, incident_type: RENT, target_kind: p.targetKind, target_id: p.targetId, run_id: input.runId,
    dedup_key: p.dedupKey, facts: p.facts as unknown as Json, is_simulated: input.isSimulated,
  }));
  const { data, error } = await db.from("incidents").upsert(rows, { onConflict: "user_id,dedup_key", ignoreDuplicates: true }).select("id, facts, user_id, detected_at, dedup_key");
  if (error) throw new Error(`시세 알림을 만들지 못했습니다: ${error.message}`);
  return data;
}

/** FR-005: 관심 지역의 지난번 값. 알림을 저장한 **뒤에** 쓴다(실패한 달의 변화를 다음 수집이 다시 잡도록) */
export async function updateAreaMedians(db: AdminClient, updates: AreaUpdate[]): Promise<void> {
  for (const u of updates) {
    const { error } = await db.from("interest_areas").update({ last_median_value: u.rent, last_median_deposit: u.deposit }).eq("id", u.areaId);
    if (error) throw new Error(`관심 지역 지난번 값을 저장하지 못했습니다: ${error.message}`);
  }
}

/** FR-006: 새 알림마다 계획. AI 초안이 있으면 그 글과 할 일, 없으면 기본 할 일. 날짜는 코드가 붙인다 */
export async function insertRentPlans(db: AdminClient, created: CreatedRentIncident[], drafts: ReadonlyMap<string, DraftResult>): Promise<PlanStats> {
  if (created.length === 0) return { drafted: 0, failed: 0, skipped: 0, failureReasons: [] };
  const rows = created.map((incident) => {
    const facts = incident.facts as unknown as RentFacts;
    const draft = drafts.get(incident.dedup_key);
    const base = { incident_id: incident.id, plan_type: "response_plan", citations: [{ kind: "rtms", label: "국토교통부 전월세 실거래가" }] as unknown as Json };
    if (!draft?.ok) return { ...base, generation_status: "failed", checklist: defaultRentChecklist(facts) as unknown as Json };
    return {
      ...base, generation_status: "succeeded", ai_summary: draft.draft.summary, model: draft.model,
      checklist: draft.draft.labels.map((label) => ({ label, dueOn: facts.dueDate })) as unknown as Json,
    };
  });
  const { error } = await db.from("response_plans").upsert(rows, { onConflict: "incident_id", ignoreDuplicates: true });
  if (error) throw new Error(`대응 계획을 만들지 못했습니다: ${error.message}`);
  const drafted = rows.filter((row) => row.generation_status === "succeeded").length;
  const values = [...drafts.values()];
  const failureReasons = [...new Set(values.flatMap((d) => (d.ok || d.skipped ? [] : [d.reason])))];
  return { drafted, failed: rows.length - drafted, skipped: values.filter((d) => !d.ok && d.skipped).length, failureReasons };
}
