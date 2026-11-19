"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseChecklistForm } from "@/incident/move-in-checklist";
import { createClient, currentUserId } from "@/lib/supabase/server";

export type ChecklistSaveState = { error?: string; savedAt?: string };

/** spec 019 FR-001: 관심 주택 한 곳의 입주 전 점검 저장. 내 행만(RLS interest_homes_update_own + user_id 조건) */
export async function saveMoveInChecklist(_prev: ChecklistSaveState, formData: FormData): Promise<ChecklistSaveState> {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const homeId = String(formData.get("homeId") ?? "");
  const parsed = parseChecklistForm({ checked: formData.getAll("checked").map(String), note: String(formData.get("note") ?? "") });
  if (!parsed.ok) return { error: parsed.error };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interest_homes")
    .update({ move_in_checklist: parsed.checklist, move_in_note: parsed.note, updated_at: new Date().toISOString() })
    .eq("id", homeId)
    .eq("user_id", userId)
    .select("id");
  if (error || !data?.length) return { error: "점검을 저장하지 못했습니다. 잠시 뒤 다시 저장해 주세요." };
  revalidatePath("/qc/checklist");
  return { savedAt: new Date().toISOString() };
}
