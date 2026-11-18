"use server";

import { revalidatePath } from "next/cache";
import type { Json } from "@/lib/supabase/database.types";
import { createClient, currentUserId } from "@/lib/supabase/server";
import { getScheduleItem } from "@/incident/schedule.server";

/** FR-013 (spec 001): 체크리스트 한 항목의 완료 표시를 바꿔 저장한다. 내 일정만 (RLS) */
export async function toggleChecklistItem(scheduleId: string, index: number): Promise<{ error?: string }> {
  if (!(await currentUserId())) return { error: "로그인이 끝났습니다. 다시 로그인해 주세요." };
  const item = await getScheduleItem(scheduleId);
  if (!item || index < 0 || index >= item.checklist.length) return { error: "항목을 찾을 수 없습니다. 새로고침해 주세요." };
  const checklist = item.checklist.map((entry, i) => (i === index ? { ...entry, done: !entry.done } : entry));
  const supabase = await createClient();
  const { error } = await supabase
    .from("schedule_items")
    .update({ checklist_state: checklist as unknown as Json, updated_at: new Date().toISOString() })
    .eq("id", scheduleId);
  if (error) return { error: "저장하지 못했습니다. 잠시 뒤 다시 눌러 주세요." };
  revalidatePath(`/schedule/${scheduleId}`);
  return {};
}
