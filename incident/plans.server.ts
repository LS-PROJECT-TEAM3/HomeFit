import { buildDefaultChecklist } from "@/incident/checklist";
import { buildPlanPrompt, composeChecklist } from "@/incident/plan-draft";
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

/** 공고 내용별 초안. 같은 공고라도 단지마다 임대료·공급 유형이 다르면 따로 만든다 (리뷰 2026-11-17) */
export type Drafts = Map<string, DraftResult>;

/**
 * FR-010 (spec 001): 새로 만들 사건의 초안을 사건을 저장하기 **전에** 받는다.
 * 느린 Claude 호출이 사건 저장과 계획 저장 사이에 끼면, 시간 제한에 걸렸을 때 계획 없는 사건이 남는다.
 * AI에 보내는 내용이 같으면 한 번만 부르고, 한도를 지키려고 차례대로 부른다.
 */
export async function draftPlans(notices: readonly Notice[]): Promise<Drafts> {
  const drafts: Drafts = new Map();
  for (const notice of notices) {
    const key = buildPlanPrompt(notice);
    if (!drafts.has(key)) drafts.set(key, await draftPlan(notice));
  }
  return drafts;
}

/** FR-010 (spec 001): 방금 만든 사건마다 신청 준비 계획을 저장한다 */
export async function insertPlans(db: AdminClient, incidents: CreatedIncident[], drafts: Drafts): Promise<PlanStats> {
  if (incidents.length === 0) return { drafted: 0, failed: 0, failureReasons: [] };
  const rows = incidents.map((incident) => {
    const notice = incident.facts as unknown as Notice; // facts는 Notice로 저장했다 (incident/detect.ts)
    return planRow(incident.id, notice, drafts.get(buildPlanPrompt(notice)));
  });
  const { error } = await db.from("response_plans").insert(rows);
  if (error) throw new Error(`신청 준비 계획을 만들지 못했습니다: ${error.message}`);
  const drafted = rows.filter((row) => row.generation_status === "succeeded").length;
  const failureReasons = [...new Set([...drafts.values()].flatMap((draft) => (draft.ok ? [] : [draft.reason])))];
  return { drafted, failed: rows.length - drafted, failureReasons };
}
