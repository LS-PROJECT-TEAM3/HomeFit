"use server";

import { revalidatePath } from "next/cache";
import { EDITABLE_FIELDS, parseAdminEdit, type EditTable, type EditValue } from "@/incident/admin-edit";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "../../guard";

/** values: 오류가 났을 때 입력한 글자를 그대로 다시 보이려고 (폼이 다시 그려지면 처음 값으로 돌아가므로) */
/** savedAt: 저장할 때마다 바뀌어 폼을 새로 그린다(이전 사유가 남지 않게, PR #11 리뷰) */
export type EditState = { saved?: boolean; savedAt?: number; error?: string; errors?: Record<string, string>; values?: Record<string, string> };

const DB_ERRORS: Record<string, string> = {
  not_admin: "관리자만 고칠 수 있습니다.",
  target_not_found: "고칠 행을 찾지 못했습니다. 회원이 지웠을 수 있으니 새로 고쳐 보세요.",
};

function isEditTable(value: string): value is EditTable {
  return value in EDITABLE_FIELDS;
}

/** 고치기 전 값을 DB에서 다시 읽는다(화면에 남은 값을 믿지 않는다). 관리자 읽기는 RLS가 허용 */
async function loadBefore(table: EditTable, targetId: string): Promise<Record<string, EditValue> | null> {
  const supabase = await createClient();
  const columns = Object.keys(EDITABLE_FIELDS[table]).join(", ");
  const query = table === "homes"
    ? supabase.from("homes").select(columns).eq("id", targetId)
    : supabase.from("policy_conditions").select(columns).eq("user_id", targetId);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error("고치기 전 값을 읽지 못했습니다.");
  if (!data) return null;
  const row = data as unknown as Record<string, EditValue>; // 칸 이름을 문자열로 골라 Supabase 타입이 좁혀지지 않는다
  // numeric 칸은 글자로 올 수 있어 숫자로 맞춘다
  return table === "homes" && row.exclusive_area_m2 !== null ? { ...row, exclusive_area_m2: Number(row.exclusive_area_m2) } : row;
}

// spec 010 FR-003 (PRD FR-20, IA AD_070102_MD): 관리자 수정. 수정과 기록은 DB 함수 하나가 함께 한다(E11)
export async function saveMemberEdit(_prev: EditState, formData: FormData): Promise<EditState> {
  if (!(await requireAdmin())) return { error: DB_ERRORS.not_admin };
  const table = String(formData.get("table") ?? "");
  const targetId = String(formData.get("targetId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  if (!isEditTable(table) || !targetId) return { error: "고칠 대상을 알 수 없습니다. 화면을 새로 고쳐 주세요." };
  const before = await loadBefore(table, targetId);
  if (!before) return { error: DB_ERRORS.target_not_found };
  const form = Object.fromEntries([...Object.keys(EDITABLE_FIELDS[table]), "reason"].map((name) => [name, String(formData.get(name) ?? "")]));
  const parsed = parseAdminEdit({ table, form, before });
  if (!parsed.ok) return { errors: parsed.errors, values: form };
  const { error } = await (await createClient()).rpc("admin_update_member_input", {
    p_table: table, p_target_id: targetId, p_changes: parsed.changes, p_reason: parsed.reason,
  });
  if (error) return { error: DB_ERRORS[error.message] ?? "저장하지 못했습니다. 잠시 뒤 다시 해 주세요.", values: form };
  revalidatePath(`/admin/users/${memberId}`);
  return { saved: true, savedAt: Date.now() };
}
