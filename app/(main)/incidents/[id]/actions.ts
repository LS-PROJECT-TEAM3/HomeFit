"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, currentUserId } from "@/lib/supabase/server";

export type DecisionState = { error?: string; done?: "approved" | "rejected"; scheduleId?: string };

// DB 함수가 던지는 오류 이름 → 화면 문구 ("무엇이 안 됐는지 + 할 일")
const MESSAGES: Record<string, string> = {
  incident_not_found: "알림을 찾을 수 없습니다. 목록에서 다시 열어 주세요.",
  plan_not_found: "신청 준비 계획이 아직 없습니다. 잠시 뒤 다시 열어 주세요.",
  already_rejected: "이미 거절한 알림이라 승인할 수 없습니다.",
  reason_required: "거절 사유를 입력해 주세요. 예: 자격이 안 됨",
  incident_not_open: "이미 처리한 알림입니다. 화면을 새로고침해 주세요.",
};

function messageFor(raw: string | undefined): string {
  const key = Object.keys(MESSAGES).find((name) => raw?.includes(name));
  return key ? MESSAGES[key] : "처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.";
}

/** FR-011 (spec 001): 승인. 이력·상태·내 일정은 DB 함수가 한 번에, 본인 사건만 처리한다 */
export async function approveIncident(incidentId: string): Promise<DecisionState> {
  if (!(await currentUserId())) return { error: "로그인이 끝났습니다. 다시 로그인해 주세요." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("approve_incident", { p_incident_id: incidentId });
  if (error) return { error: messageFor(error.message) };
  revalidatePath(`/incidents/${incidentId}`);
  return { done: "approved", scheduleId: data };
}

/** FR-012 (spec 001): 거절. 사유 필수, 일정과 다른 값은 그대로 */
export async function rejectIncident(incidentId: string, reason: string): Promise<DecisionState> {
  if (!(await currentUserId())) return { error: "로그인이 끝났습니다. 다시 로그인해 주세요." };
  if (reason.trim() === "") return { error: MESSAGES.reason_required };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_incident", { p_incident_id: incidentId, p_reason: reason });
  if (error) return { error: messageFor(error.message) };
  revalidatePath(`/incidents/${incidentId}`);
  return { done: "rejected" };
}

export type UndoState = { error?: string; done?: true };

/** 취소할 수 없을 때: 이미 승인 대기면 그렇다고(E2), 아니면 새로고침 안내(E3) */
async function notUndoableMessage(incidentId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from("incidents").select("status").eq("id", incidentId).maybeSingle();
  if (data?.status === "new" || data?.status === "pending") return "이미 승인 대기로 돌아간 알림입니다. 화면을 새로고침해 주세요.";
  return "지금은 취소할 수 없는 알림입니다. 화면을 새로고침해 주세요.";
}

async function undo(incidentId: string, fn: "cancel_approval" | "cancel_rejection"): Promise<UndoState> {
  if (!(await currentUserId())) redirect("/login"); // FR-007: 로그인이 끝났으면 로그인 화면으로
  const supabase = await createClient();
  const { error } = await supabase.rpc(fn, { p_incident_id: incidentId });
  if (error && /incident_not_(approved|rejected)/.test(error.message)) return { error: await notUndoableMessage(incidentId) };
  if (error) return { error: "취소하지 못했습니다. 잠시 뒤 다시 해 주세요." };
  revalidatePath(`/incidents/${incidentId}`);
  revalidatePath("/schedule");
  return { done: true };
}

/** spec 023 FR-004·FR-005: 승인 취소. 이력 한 줄·그 승인으로 만든 일정 지우기·승인 대기로를 DB 함수가 한 번에, 본인 사건만 */
export async function cancelApproval(incidentId: string): Promise<UndoState> {
  return undo(incidentId, "cancel_approval");
}

/** spec 023 FR-008: 거절 취소. 승인 대기로 돌려 다시 승인·거절할 수 있게 */
export async function cancelRejection(incidentId: string): Promise<UndoState> {
  return undo(incidentId, "cancel_rejection");
}
