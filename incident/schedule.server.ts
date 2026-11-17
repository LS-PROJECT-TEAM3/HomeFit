import type { ChecklistItem } from "@/incident/checklist";
import { createClient } from "@/lib/supabase/server";

// 내 일정 자료 (FR-011·013). 로그인한 사용자 권한(RLS)으로 읽고 쓴다
export type ChecklistState = ChecklistItem & { done: boolean };
export type ScheduleItem = { id: string; incidentId: string; title: string; dueDate: string | null; checklist: ChecklistState[] };

type Row = { id: string; incident_id: string; title: string; due_date: string | null; checklist_state: unknown };

function toItem(row: Row): ScheduleItem {
  return {
    id: row.id, incidentId: row.incident_id, title: row.title, dueDate: row.due_date,
    checklist: row.checklist_state as ChecklistState[], // 승인 함수(approve_incident)가 이 모양으로 넣는다
  };
}

const COLUMNS = "id, incident_id, title, due_date, checklist_state";

export async function listSchedule(limit = 50): Promise<ScheduleItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schedule_items")
    .select(COLUMNS)
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error("내 일정을 불러오지 못했습니다.");
  return data.map(toItem);
}

export async function getScheduleItem(id: string): Promise<ScheduleItem | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("schedule_items").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error("일정을 불러오지 못했습니다.");
  return data ? toItem(data) : null;
}
