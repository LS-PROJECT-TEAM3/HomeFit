import { RISK_RULES, type Measurement, type WindowType } from "@/incident/condensation";
import type { HomeForCheck, HumidityUpdate, OpenHumidityIncident, PlannedHumidityIncident } from "@/incident/humidity-detect";
import { defaultHumidityChecklist } from "@/incident/humidity-plan";
import type { CreatedIncident } from "@/incident/plans.server";
import type { AdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

// FR-004, FR-005, FR-007 (spec 003): 습도·결로 사건에 필요한 DB 읽기·쓰기. 수집은 사용자 없이 돌아 secret 키로 쓴다

const HUMIDITY = "humidity_condensation";

/** 내 집 전부와 집마다 가장 최근 측정값 하나. 7일 넘은 값은 쓰지 않아 읽지 않는다(Q4, 3단계 리뷰 2) */
export async function loadHomesForCheck(db: AdminClient, now: Date): Promise<HomeForCheck[]> {
  const { data: homes, error } = await db.from("homes").select("id, user_id, sigungu_code, window_type");
  if (error) throw new Error(`내 집을 읽지 못했습니다: ${error.message}`);
  if (homes.length === 0) return [];
  const { data: rows, error: measureError } = await db
    .from("indoor_measurements")
    .select("home_id, temperature_c, humidity_pct, measured_at")
    .in("home_id", homes.map((home) => home.id))
    .gte("measured_at", new Date(now.getTime() - RISK_RULES.measurementMaxAgeMs).toISOString())
    .order("measured_at", { ascending: false });
  if (measureError) throw new Error(`측정값을 읽지 못했습니다: ${measureError.message}`);
  const latest = new Map<string, Measurement>();
  for (const row of rows) {
    if (!latest.has(row.home_id)) {
      latest.set(row.home_id, { temperatureC: Number(row.temperature_c), humidityPct: Number(row.humidity_pct), measuredAt: row.measured_at });
    }
  }
  return homes.map((home) => ({
    homeId: home.id, userId: home.user_id, sigunguCode: home.sigungu_code,
    windowType: home.window_type as WindowType, measurement: latest.get(home.id) ?? null,
  }));
}

/** 같은 48시간 판단에 쓸 최근 습도 사건(최근 4일). 오래된 것은 어느 창에도 걸리지 않는다 */
export async function loadRecentHumidityIncidents(db: AdminClient, now: Date): Promise<OpenHumidityIncident[]> {
  const since = new Date(now.getTime() - 4 * 86_400_000).toISOString();
  const { data, error } = await db
    .from("incidents")
    .select("id, target_id, status, facts")
    .eq("incident_type", HUMIDITY)
    .gte("detected_at", since);
  if (error) throw new Error(`기존 습도 사건을 읽지 못했습니다: ${error.message}`);
  return data.flatMap((row) => {
    const facts = row.facts as { windowStart?: string; marginC?: number } | null;
    if (!row.target_id || !facts?.windowStart || typeof facts.marginC !== "number") return [];
    return [{ id: row.id, homeId: row.target_id, windowStart: facts.windowStart, marginC: facts.marginC, status: row.status }];
  });
}

/**
 * 새 습도 사건. 같은 키가 동시에 들어오면 DB 유일 조건(user_id, dedup_key)이 막고 건너뛴다
 * (수집이 두 번 겹쳐 돌아도 사건은 하나, CLAUDE.md 팀 규칙)
 */
export async function insertHumidityIncidents(db: AdminClient, input: { planned: PlannedHumidityIncident[]; runId: string; isSimulated: boolean }): Promise<CreatedIncident[]> {
  if (input.planned.length === 0) return [];
  const rows = input.planned.map((plan) => ({
    user_id: plan.userId, incident_type: HUMIDITY, target_kind: "home", target_id: plan.homeId, run_id: input.runId,
    dedup_key: plan.dedupKey, facts: plan.facts as unknown as Json, is_simulated: input.isSimulated,
  }));
  const { data, error } = await db
    .from("incidents")
    .upsert(rows, { onConflict: "user_id,dedup_key", ignoreDuplicates: true })
    .select("id, facts, user_id, detected_at");
  if (error) throw new Error(`습도 사건을 만들지 못했습니다: ${error.message}`);
  return data;
}

/** 더 위험해진 열린 사건을 새 숫자로 갱신(문제정의 "위험이 커지면 기존 사건을 갱신"). 승인·거절된 것은 건드리지 않는다 */
export async function updateHumidityIncidents(db: AdminClient, updates: HumidityUpdate[]): Promise<CreatedIncident[]> {
  const updated: CreatedIncident[] = [];
  for (const update of updates) {
    const { data, error } = await db
      .from("incidents")
      .update({ facts: update.facts as unknown as Json, is_updated: true })
      .eq("id", update.incidentId)
      .in("status", ["new", "pending"])
      .select("id, facts, user_id, detected_at");
    if (error) throw new Error(`습도 사건을 갱신하지 못했습니다: ${error.message}`);
    updated.push(...data);
    // 계획의 할 일 날짜도 새 마감일로 맞춘다
    const checklist = defaultHumidityChecklist({ dueDate: update.facts.dueDate, condition: update.facts.condition });
    const { error: planError } = await db.from("response_plans").update({ checklist: checklist as unknown as Json }).eq("incident_id", update.incidentId);
    if (planError) throw new Error(`대응 계획을 갱신하지 못했습니다: ${planError.message}`);
  }
  return updated;
}

/** 새 사건마다 기본 대응 계획(AI 초안은 4단계). 계획이 있어야 승인할 수 있다 */
export async function insertDefaultHumidityPlans(db: AdminClient, created: CreatedIncident[]): Promise<void> {
  if (created.length === 0) return;
  const rows = created.map((incident) => {
    const facts = incident.facts as { dueDate: string; condition: "surface" | "humidity" };
    return {
      incident_id: incident.id, plan_type: "response_plan", generation_status: "failed",
      checklist: defaultHumidityChecklist(facts) as unknown as Json,
      citations: [{ kind: "forecast", label: "기상청 단기예보" }] as unknown as Json,
    };
  });
  const { error } = await db.from("response_plans").upsert(rows, { onConflict: "incident_id", ignoreDuplicates: true });
  if (error) throw new Error(`대응 계획을 만들지 못했습니다: ${error.message}`);
}
