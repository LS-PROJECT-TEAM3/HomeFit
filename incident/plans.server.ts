import { buildDefaultChecklist } from "@/incident/checklist";
import { composeChecklist } from "@/incident/plan-draft";
import { draftPlan, type DraftResult } from "@/incident/plan-draft.server";
import type { AdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import type { Notice } from "@/watch/notice";

export type CreatedIncident = { id: string; facts: Json };
/** failureReasons: 초안 실패 이유(중복 없이). 실행 기록에 남겨 원인을 바로 찾게 한다 (FR-004) */
export type PlanStats = { drafted: number; failed: number; failureReasons: string[] };

function citationsFor(notice: Notice): Json {
  return notice.url ? [{ kind: "notice", label: "마이홈 공고 원문", url: notice.url }] : [];
}

function planRow(incidentId: string, notice: Notice, result: DraftResult | undefined) {
  const base = { incident_id: incidentId, plan_type: "application_prep", citations: citationsFor(notice) };
  if (!result?.ok) {
    return { ...base, checklist: buildDefaultChecklist(notice) as unknown as Json, generation_status: "failed" };
  }
  return {
    ...base,
    ai_summary: result.draft.summary,
    checklist: composeChecklist(result.draft.labels, notice) as unknown as Json,
    generation_status: "succeeded",
    model: result.model,
  };
}

/**
 * FR-010 (spec 001): 새 사건마다 신청 준비 계획을 만든다.
 * 같은 공고는 사용자가 여럿이어도 Claude를 한 번만 부르고, 한도를 지키려고 차례대로 부른다.
 */
export async function insertPlans(db: AdminClient, incidents: CreatedIncident[]): Promise<PlanStats> {
  if (incidents.length === 0) return { drafted: 0, failed: 0, failureReasons: [] };
  const notices = new Map<string, Notice>();
  for (const incident of incidents) {
    const notice = incident.facts as unknown as Notice; // facts는 Notice로 저장했다 (incident/detect.ts)
    notices.set(notice.announcementId, notice);
  }
  const drafts = new Map<string, DraftResult>();
  for (const [announcementId, notice] of notices) drafts.set(announcementId, await draftPlan(notice));

  const rows = incidents.map((incident) => {
    const notice = incident.facts as unknown as Notice;
    return planRow(incident.id, notice, drafts.get(notice.announcementId));
  });
  const { error } = await db.from("response_plans").insert(rows);
  if (error) throw new Error(`신청 준비 계획을 만들지 못했습니다: ${error.message}`);
  const drafted = rows.filter((row) => row.generation_status === "succeeded").length;
  const failureReasons = [...new Set([...drafts.values()].flatMap((draft) => (draft.ok ? [] : [draft.reason])))];
  return { drafted, failed: rows.length - drafted, failureReasons };
}
