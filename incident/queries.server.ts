import type { ChecklistItem } from "@/incident/checklist";
import { periodStart, type IncidentFilter } from "@/incident/filter";
import { createClient, requireUserId } from "@/lib/supabase/server";
import type { IncidentFacts } from "@/incident/detect";
import type { HumidityFacts } from "@/incident/humidity-detect";
import type { RentFacts } from "@/incident/rent-detect";

// 사건 화면이 읽는 자료. 로그인한 사용자 권한(RLS)으로 읽는다 (FR-014).
// RLS는 관리자에게 모든 사건을 보여 주므로 목록·건수는 user_id로 내 것만 거른다 (FR-007, 리뷰 2026-11-17)
// 읽기 실패는 던져서 화면이 "조회 실패"를 보이게 한다(빈 목록으로 숨기지 않음, P3-12)

export type IncidentSummary = {
  id: string; status: string; facts: IncidentFacts; isUpdated: boolean; isSimulated: boolean; detectedAt: string;
  /** 습도·결로 사건이면 판단 근거(spec 003 FR-006). 공고 사건이면 null */
  humidity: HumidityFacts | null;
  /** 시세 사건이면 비교표 근거(spec 008 FR-006) */
  rent: RentFacts | null;
};

const PAGE_SIZE = 20;

type SummaryRow = { id: string; status: string; incident_type: string; facts: unknown; is_updated: boolean; is_simulated: boolean; detected_at: string };

function toSummary(row: SummaryRow): IncidentSummary {
  return {
    id: row.id, status: row.status, facts: row.facts as IncidentFacts, // 공고 사건 facts는 IncidentFacts로 저장했다 (incident/detect.ts)
    isUpdated: row.is_updated, isSimulated: row.is_simulated, detectedAt: row.detected_at,
    // 습도 사건 facts는 HumidityFacts로 저장했다 (incident/humidity-detect.ts)
    humidity: row.incident_type === "humidity_condensation" ? (row.facts as HumidityFacts) : null,
    rent: row.incident_type === "rent_price_change" ? (row.facts as RentFacts) : null, // incident/rent-detect.ts
  };
}

export async function listIncidents(filter: IncidentFilter, now: Date): Promise<IncidentSummary[]> {
  const [supabase, userId] = await Promise.all([createClient(), requireUserId()]);
  let query = supabase
    .from("incidents")
    .select("id, status, incident_type, facts, is_updated, is_simulated, detected_at")
    .eq("user_id", userId)
    .order("detected_at", { ascending: false })
    .limit(PAGE_SIZE);
  if (filter.status !== "all") query = query.eq("status", filter.status);
  const since = periodStart(filter.period, now);
  if (since) query = query.gte("detected_at", since);
  const { data, error } = await query;
  if (error) throw new Error("사건을 불러오지 못했습니다.");
  return data.map(toSummary);
}

export async function countOpenIncidents(): Promise<{ newCount: number; pendingCount: number }> {
  const [supabase, userId] = await Promise.all([createClient(), requireUserId()]);
  const mine = () => supabase.from("incidents").select("id", { count: "exact", head: true }).eq("user_id", userId);
  const [fresh, pending] = await Promise.all([
    mine().eq("status", "new"),
    mine().eq("status", "pending"),
  ]);
  if (fresh.error || pending.error) throw new Error("사건 수를 불러오지 못했습니다.");
  return { newCount: fresh.count ?? 0, pendingCount: pending.count ?? 0 };
}

export type CollectionStatus = { lastStatus: string | null; lastSuccessAt: string | null };

export async function myhomeCollectionStatus(): Promise<CollectionStatus> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("collection_status", { p_source: "myhome_notice" });
  if (error) throw new Error("수집 상태를 불러오지 못했습니다.");
  const row = data[0];
  return { lastStatus: row?.last_status ?? null, lastSuccessAt: row?.last_success_at ?? null };
}

export type IncidentDetail = IncidentSummary & {
  isMine: boolean;
  firstViewedAt: string | null;
  plan: { id: string; summary: string | null; checklist: ChecklistItem[]; citations: { label: string; url: string }[]; aiOk: boolean; isMock: boolean } | null;
  actions: { action: string; reason: string | null; createdAt: string }[];
  /** 승인으로 생긴 내 일정 (FR-011) */
  scheduleId: string | null;
};

/** FR-009·010: 상세. 없거나 볼 수 없으면 null (RLS가 남의 사건을 걸러 null이 된다) */
export async function getIncidentDetail(id: string, userId: string): Promise<IncidentDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("incidents")
    .select("id, user_id, status, incident_type, facts, is_updated, is_simulated, detected_at, first_viewed_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("사건을 불러오지 못했습니다.");
  if (!data) return null;
  const [plans, actions, schedule] = await Promise.all([
    supabase.from("response_plans").select("id, ai_summary, checklist, citations, generation_status, model").eq("incident_id", id).maybeSingle(),
    supabase.from("incident_actions").select("action, reason, created_at").eq("incident_id", id).order("created_at"),
    supabase.from("schedule_items").select("id").eq("incident_id", id).maybeSingle(),
  ]);
  if (plans.error || actions.error || schedule.error) throw new Error("사건을 불러오지 못했습니다.");
  const plan = plans.data;
  return {
    ...toSummary(data),
    isMine: data.user_id === userId,
    firstViewedAt: data.first_viewed_at,
    plan: plan
      ? {
          id: plan.id, summary: plan.ai_summary, checklist: plan.checklist as ChecklistItem[],
          citations: plan.citations as { label: string; url: string }[], aiOk: plan.generation_status === "succeeded",
          // spec 002 plan §5: mock 요약을 진짜 요약으로 착각하지 않게 표시한다
          isMock: plan.model?.startsWith("mock:") ?? false,
        }
      : null,
    actions: actions.data.map((a) => ({ action: a.action, reason: a.reason, createdAt: a.created_at })),
    scheduleId: schedule.data?.id ?? null,
  };
}
