import { createClient } from "@/lib/supabase/server";
import { POLICY_SOURCE } from "./policy-schedule";

// spec 026 FR-001~003: 내 정책 팔로우와 정책 일정 읽기. 로그인한 사용자 권한(RLS)으로, user_id로 내 것만(관리자도 남의 것을 섞지 않게)

/** 목록용: 내가 팔로우한 정책 ID(E5: ID가 같은 줄만 팔로우 중) */
export async function listMyPolicyFollows(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("notice_follows").select("announcement_id")
    .eq("user_id", userId).eq("source_code", POLICY_SOURCE).eq("decision", "follow");
  if (error) throw new Error("팔로우한 정책을 불러오지 못했습니다.");
  return data.map((row) => row.announcement_id);
}

/** 상세용: 이 정책을 팔로우했는지, 이미 넣은 일정이 있는지 */
export async function policyFollowState(userId: string, policyId: string): Promise<{ followed: boolean; scheduleId: string | null }> {
  const supabase = await createClient();
  const [follow, schedule] = await Promise.all([
    supabase.from("notice_follows").select("decision").eq("user_id", userId).eq("source_code", POLICY_SOURCE).eq("announcement_id", policyId).maybeSingle(),
    supabase.from("schedule_items").select("id").eq("user_id", userId).eq("source_code", POLICY_SOURCE).eq("announcement_id", policyId).maybeSingle(),
  ]);
  if (follow.error || schedule.error) throw new Error("팔로우 상태를 불러오지 못했습니다.");
  return { followed: follow.data?.decision === "follow", scheduleId: schedule.data?.id ?? null };
}
