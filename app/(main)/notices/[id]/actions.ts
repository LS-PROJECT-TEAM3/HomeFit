"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildDefaultChecklist } from "@/incident/checklist";
import type { FollowDecision } from "@/incident/matched";
import { addToScheduleError } from "@/incident/schedule-origin";
import type { Json } from "@/lib/supabase/database.types";
import type { Notice } from "@/watch/notice";
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

export type ClearState = { cleared?: true; error?: string };

/**
 * spec 023 FR-001·FR-002 (PRD FR-38 v1.21): 팔로우·관심 없음을 지워 "새 공고"(정하지 않음)로. 본인 줄만(RLS notice_follows_delete_own).
 * 이미 없는 줄이면 그냥 "새 공고"(E1). 이미 생긴 알림과 일정은 그대로(FR-003, E4)
 */
export async function clearNoticeDecision(announcementId: string): Promise<ClearState> {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  if (!announcementId) return { error: "공고를 찾을 수 없습니다." };
  const supabase = await createClient();
  const { error } = await supabase.from("notice_follows").delete()
    .eq("user_id", userId).eq("source_code", "myhome_notice").eq("announcement_id", announcementId);
  if (error) return { error: "되돌리지 못했습니다. 잠시 뒤 다시 해 주세요." };
  revalidatePath("/notices");
  return { cleared: true };
}

const MAX_BULK = 100;

/**
 * spec 022(v2-s3-select-pc, 현경 결정 2026-11-22): 목록에서 여러 공고를 한꺼번에 팔로우·관심 없음으로. 관심 없음 사유는 하나로 같이 저장.
 * 한 줄씩 결정하는 것과 같은 표(notice_follows), 본인 행만(RLS)
 */
export async function decideNotices(announcementIds: string[], decision: FollowDecision, reason: string): Promise<FollowState> {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const ids = [...new Set(announcementIds.filter((id) => typeof id === "string" && id !== ""))];
  if (ids.length === 0) return { error: "고른 공고가 없습니다. 공고를 하나 이상 골라 주세요." };
  if (ids.length > MAX_BULK) return { error: `한 번에 ${MAX_BULK}개까지 바꿀 수 있습니다.` };
  if (decision !== "follow" && decision !== "ignore") return { error: "알 수 없는 결정입니다." };
  const trimmed = reason.trim().slice(0, MAX_REASON);
  const decidedAt = new Date().toISOString();
  const supabase = await createClient();
  const { error } = await supabase.from("notice_follows").upsert(ids.map((id) => ({
    user_id: userId, source_code: "myhome_notice", announcement_id: id,
    decision, reason: decision === "ignore" && trimmed !== "" ? trimmed : null, decided_at: decidedAt,
  })));
  if (error) return { error: "저장하지 못했습니다. 잠시 뒤 다시 해 주세요." };
  revalidatePath("/notices");
  return { decision };
}

export type AddToScheduleState = { scheduleId?: string; error?: string };

/**
 * spec 007 FR-001~003 (PRD FR-16 v1.9): 팔로우한 공고를 알림 없이 내 일정에. 누르는 것이 사용자의 승인이다.
 * 팔로우 여부·중복은 DB 함수(add_notice_to_schedule)가 누른 사람 권한으로 다시 검사한다.
 */
export async function addNoticeToSchedule(announcementId: string): Promise<AddToScheduleState> {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  if (!announcementId) return { error: addToScheduleError("notice_not_found") };
  const supabase = await createClient();
  const item = await supabase.from("source_items").select("raw").eq("source_code", "myhome_notice").like("external_id", `${announcementId}-%`).order("apply_end", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
  if (item.error) return { error: addToScheduleError("") };
  if (!item.data) return { error: addToScheduleError("notice_not_found") };
  const checklist = buildDefaultChecklist(item.data.raw as unknown as Notice); // raw는 Notice로 저장했다
  const { data, error } = await supabase.rpc("add_notice_to_schedule", { p_announcement_id: announcementId, p_checklist: checklist as unknown as Json });
  if (error) return { error: addToScheduleError(error.message) };
  revalidatePath("/schedule");
  return { scheduleId: data };
}
