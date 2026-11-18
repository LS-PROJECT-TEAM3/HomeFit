import type { ChecklistItem } from "@/incident/checklist";
import { createClient, requireUserId } from "@/lib/supabase/server";

// 내 일정 자료 (FR-011·013). 로그인한 사용자 권한(RLS)으로 읽고 쓴다
export type ChecklistState = ChecklistItem & { done: boolean };
// spec 007: 알림에서 온 일정은 incidentId, 공고에서 온 일정은 announcementId
export type ScheduleItem = { id: string; incidentId: string | null; announcementId: string | null; title: string; dueDate: string | null; checklist: ChecklistState[] };

type Row = { id: string; incident_id: string | null; announcement_id: string | null; title: string; due_date: string | null; checklist_state: unknown };

function toItem(row: Row): ScheduleItem {
  return {
    id: row.id, incidentId: row.incident_id, announcementId: row.announcement_id, title: row.title, dueDate: row.due_date,
    checklist: row.checklist_state as ChecklistState[], // approve_incident·add_notice_to_schedule이 이 모양으로 넣는다
  };
}

const COLUMNS = "id, incident_id, announcement_id, title, due_date, checklist_state";

// RLS는 관리자에게 모든 일정을 보여 주므로 user_id로 내 것만 거른다 (FR-013, 리뷰 2026-11-17)
export async function listSchedule(limit = 50): Promise<ScheduleItem[]> {
  const [supabase, userId] = await Promise.all([createClient(), requireUserId()]);
  const { data, error } = await supabase
    .from("schedule_items")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error("내 일정을 불러오지 못했습니다.");
  return data.map(toItem);
}

export async function getScheduleItem(id: string): Promise<ScheduleItem | null> {
  const [supabase, userId] = await Promise.all([createClient(), requireUserId()]);
  const { data, error } = await supabase.from("schedule_items").select(COLUMNS).eq("id", id).eq("user_id", userId).maybeSingle();
  if (error) throw new Error("일정을 불러오지 못했습니다.");
  return data ? toItem(data) : null;
}
