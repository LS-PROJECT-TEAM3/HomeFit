import type { ChecklistItem } from "@/incident/checklist";
import type { ScheduleKind } from "@/incident/schedule-calendar";
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

/**
 * spec 022(v2-s7-pc): 달력 색. 공고에서 왔거나 주거 기회 알림이면 신청 준비, 습도·시세 알림이면 위험 대응.
 * 알림 종류를 못 읽으면 신청 준비로 둔다(색만 다르고 글자 라벨은 같이 보인다)
 */
export async function listScheduleKinds(items: readonly ScheduleItem[]): Promise<Map<string, ScheduleKind>> {
  const incidentIds = items.map((i) => i.incidentId).filter((id): id is string => id !== null);
  const types = new Map<string, string>();
  if (incidentIds.length > 0) {
    const { data } = await (await createClient()).from("incidents").select("id, incident_type").in("id", incidentIds);
    for (const row of data ?? []) types.set(row.id, row.incident_type);
  }
  const risky = (id: string | null) => id !== null && ["humidity_condensation", "rent_price_change"].includes(types.get(id) ?? "");
  return new Map(items.map((i) => [i.id, risky(i.incidentId) ? "risk" : "prepare"]));
}

export async function getScheduleItem(id: string): Promise<ScheduleItem | null> {
  const [supabase, userId] = await Promise.all([createClient(), requireUserId()]);
  const { data, error } = await supabase.from("schedule_items").select(COLUMNS).eq("id", id).eq("user_id", userId).maybeSingle();
  if (error) throw new Error("일정을 불러오지 못했습니다.");
  return data ? toItem(data) : null;
}
