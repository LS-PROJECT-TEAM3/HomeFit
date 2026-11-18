"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseAreaForm, type AreaField, type AreaFormInput } from "@/incident/area-form";
import { createClient, currentUserId } from "@/lib/supabase/server";

export type AreaState = { errors?: Partial<Record<AreaField, string>>; error?: string; saved?: number; values?: AreaFormInput };

function readForm(formData: FormData): AreaFormInput {
  const get = (name: string) => String(formData.get(name) ?? "");
  return { sidoCode: get("sidoCode"), sigunguCodes: formData.getAll("sigunguCodes").map(String), housingType: get("housingType"), targetArea: get("targetArea"), areaUnit: get("areaUnit"), contractType: get("contractType") };
}

/** spec 008 FR-001 (PRD FR-05): 관심 지역 넣기. 서버 액션마다 로그인 확인, 내 행만(RLS interest_areas_insert_own) */
export async function addArea(_prev: AreaState, formData: FormData): Promise<AreaState> {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const values = readForm(formData);
  const parsed = parseAreaForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const supabase = await createClient();
  // 사용자 요청(2026-11-18): 고른 시군구마다 관심 지역 한 줄
  const { error } = await supabase.from("interest_areas").insert(parsed.value.sigunguCodes.map((sigunguCode) => ({
    user_id: userId, sigungu_code: sigunguCode, housing_type: parsed.value.housingType,
    target_area_m2: parsed.value.targetAreaM2, contract_type: parsed.value.contractType, created_by: userId,
  })));
  if (error) return { error: "관심 지역을 저장하지 못했습니다. 잠시 뒤 다시 해 주세요.", values };
  revalidatePath("/my/areas");
  return { saved: parsed.value.sigunguCodes.length };
}

/** 관심 지역 지우기. 내 것만 지워진다(RLS interest_areas_delete_own) */
export async function deleteArea(id: string): Promise<{ error?: string }> {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const supabase = await createClient();
  const { error } = await supabase.from("interest_areas").delete().eq("id", id).eq("user_id", userId);
  if (error) return { error: "지우지 못했습니다. 잠시 뒤 다시 해 주세요." };
  revalidatePath("/my/areas");
  return {};
}
