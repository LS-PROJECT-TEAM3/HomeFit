import type { ChecklistItem } from "@/incident/checklist";
import { periodStart, type IncidentFilter } from "@/incident/filter";
import { createClient } from "@/lib/supabase/server";
import type { Notice } from "@/watch/notice";

// 사건 화면이 읽는 자료. 모두 로그인한 사용자 권한(RLS)으로 읽어 내 것만 나온다 (FR-014)
// 읽기 실패는 던져서 화면이 "조회 실패"를 보이게 한다(빈 목록으로 숨기지 않음, P3-12)

export type IncidentSummary = {
  id: string; status: string; facts: Notice; isUpdated: boolean; isSimulated: boolean; detectedAt: string;
};

const PAGE_SIZE = 20;

function toSummary(row: { id: string; status: string; facts: unknown; is_updated: boolean; is_simulated: boolean; detected_at: string }): IncidentSummary {
  return {
    id: row.id, status: row.status, facts: row.facts as Notice, // facts는 Notice로 저장했다 (incident/detect.ts)
    isUpdated: row.is_updated, isSimulated: row.is_simulated, detectedAt: row.detected_at,
  };
}

export async function listIncidents(filter: IncidentFilter, now: Date): Promise<IncidentSummary[]> {
  const supabase = await createClient();
  let query = supabase
    .from("incidents")
    .select("id, status, facts, is_updated, is_simulated, detected_at")
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
  const supabase = await createClient();
  const [fresh, pending] = await Promise.all([
    supabase.from("incidents").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("incidents").select("id", { count: "exact", head: true }).eq("status", "pending"),
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
  plan: { id: string; summary: string | null; checklist: ChecklistItem[]; citations: { label: string; url: string }[]; aiOk: boolean } | null;
  actions: { action: string; reason: string | null; createdAt: string }[];
  /** 승인으로 생긴 내 일정 (FR-011) */
  scheduleId: string | null;
};

/** FR-009·010: 상세. 없거나 볼 수 없으면 null (RLS가 남의 사건을 걸러 null이 된다) */
export async function getIncidentDetail(id: string, userId: string): Promise<IncidentDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("incidents")
    .select("id, user_id, status, facts, is_updated, is_simulated, detected_at, first_viewed_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("사건을 불러오지 못했습니다.");
  if (!data) return null;
  const [plans, actions, schedule] = await Promise.all([
    supabase.from("response_plans").select("id, ai_summary, checklist, citations, generation_status").eq("incident_id", id).maybeSingle(),
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
        }
      : null,
    actions: actions.data.map((a) => ({ action: a.action, reason: a.reason, createdAt: a.created_at })),
    scheduleId: schedule.data?.id ?? null,
  };
}
