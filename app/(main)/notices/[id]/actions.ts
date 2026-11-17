"use server";

import { redirect } from "next/navigation";
import type { FollowDecision } from "@/incident/matched";
import { createClient, currentUserId } from "@/lib/supabase/server";

export type FollowState = { decision?: FollowDecision; error?: string };

const MAX_REASON = 200;

/**
 * FR-020 (spec 001 v0.5): 맞는 공고 팔로우 승인(follow)·거절(ignore). 서버 액션마다 로그인 확인,
 * 본인 행만 쓴다(RLS notice_follows_*_own). 결정한 시각을 남기고 나중에 바꿀 수 있다.
 */
async function decide(announcementId: string, decision: FollowDecision, reason: string | null): Promise<FollowState> {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  if (!announcementId) return { error: "공고를 찾을 수 없습니다." };
  const supabase = await createClient();
  const { error } = await supabase.from("notice_follows").upsert({
    user_id: userId, source_code: "myhome_notice", announcement_id: announcementId,
    decision, reason: decision === "ignore" ? reason : null, decided_at: new Date().toISOString(),
  });
  if (error) return { error: "저장하지 못했습니다. 잠시 뒤 다시 해 주세요." };
  return { decision };
}

export async function followNotice(announcementId: string): Promise<FollowState> {
  return decide(announcementId, "follow", null);
}

/** 사유는 선택(비워도 됨) */
export async function ignoreNotice(announcementId: string, reason: string): Promise<FollowState> {
  const trimmed = reason.trim().slice(0, MAX_REASON);
  return decide(announcementId, "ignore", trimmed === "" ? null : trimmed);
}
