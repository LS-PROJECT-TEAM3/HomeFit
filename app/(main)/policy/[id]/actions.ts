"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPolicy } from "@/incident/policies.server";
import { addPolicyToScheduleError, buildPolicyChecklist, POLICY_SOURCE } from "@/incident/policy-schedule";
import type { Json } from "@/lib/supabase/database.types";
import { createClient, currentUserId } from "@/lib/supabase/server";

// spec 026 FR-001·FR-003 (PRD FR-07·FR-16 v1.25): 정책 팔로우·풀기, 팔로우한 정책을 내 일정에. 서버 동작마다 로그인 확인(E6), 본인 줄만(RLS)
export type PolicyFollowState = { followed?: boolean; error?: string };

async function userOrLogin(): Promise<string> {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  return userId;
}

/** FR-001: 팔로우. 이미 팔로우했어도 오류 없이 팔로우 중(E1). 정책에는 관심 없음이 없어 decision은 follow만 */
export async function followPolicy(policyId: string): Promise<PolicyFollowState> {
  const userId = await userOrLogin();
  if (!policyId) return { error: "정책을 찾을 수 없습니다." };
  const supabase = await createClient();
  const { error } = await supabase.from("notice_follows").upsert({
    user_id: userId, source_code: POLICY_SOURCE, announcement_id: policyId, decision: "follow", reason: null, decided_at: new Date().toISOString(),
  });
  if (error) return { error: "팔로우하지 못했습니다. 잠시 뒤 다시 해 주세요." };
  revalidatePath("/policy");
  return { followed: true };
}

/** FR-001·FR-006: 팔로우 풀기(spec 023과 같은 방식). 이미 넣은 일정은 그대로. 없는 줄도 오류 없이(E1) */
export async function unfollowPolicy(policyId: string): Promise<PolicyFollowState> {
  const userId = await userOrLogin();
  const supabase = await createClient();
  const { error } = await supabase.from("notice_follows").delete()
    .eq("user_id", userId).eq("source_code", POLICY_SOURCE).eq("announcement_id", policyId);
  if (error) return { error: "팔로우를 풀지 못했습니다. 잠시 뒤 다시 해 주세요." };
  revalidatePath("/policy");
  return { followed: false };
}

export type AddPolicyScheduleState = { scheduleId?: string; error?: string };

/** FR-003·FR-004·FR-005: 팔로우 여부·중복·마감일은 DB 함수(add_policy_to_schedule, 0025)가 누른 사람 권한으로 다시 본다 */
export async function addPolicyToSchedule(policyId: string): Promise<AddPolicyScheduleState> {
  await userOrLogin();
  const policy = await getPolicy(policyId).catch(() => null);
  if (!policy) return { error: addPolicyToScheduleError("policy_not_found") };
  const checklist = buildPolicyChecklist(policy);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_policy_to_schedule", { p_policy_id: policyId, p_checklist: checklist as unknown as Json });
  if (error) return { error: addPolicyToScheduleError(error.message) };
  revalidatePath("/schedule");
  return { scheduleId: data };
}
