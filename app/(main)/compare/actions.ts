"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { readCostForm } from "@/app/_components/cost-fields";
import { parseInterestHomeForm, type InterestHomeField, type InterestHomeInput } from "@/incident/interest-home-form";
import { createClient, currentUserId } from "@/lib/supabase/server";

export type InterestHomeState = { errors?: Partial<Record<InterestHomeField, string>>; error?: string; saved?: boolean; values?: InterestHomeInput };

function readForm(formData: FormData): InterestHomeInput {
  const get = (name: string) => String(formData.get(name) ?? "");
  return {
    name: get("name"), sidoCode: get("sidoCode"), sigunguCode: get("sigunguCode"), housingType: get("housingType"),
    exclusiveArea: get("exclusiveArea"), areaUnit: get("areaUnit"), deposit: get("deposit"), monthlyRent: get("monthlyRent"),
    maintenanceFee: get("maintenanceFee"), ...readCostForm(formData),
  };
}

/**
 * spec 009 FR-001 (IA CP_040100_PG, CP_040300_PG): 관심 주택 넣기·고치기. 숨은 칸 id가 있으면 고친다.
 * 서버 액션마다 로그인 확인, 내 행만(RLS interest_homes_*_own)
 */
export async function saveInterestHome(_prev: InterestHomeState, formData: FormData): Promise<InterestHomeState> {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const values = readForm(formData);
  const parsed = parseInterestHomeForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const v = parsed.value;
  const row = {
    name: v.name, sigungu_code: v.sigunguCode, housing_type: v.housingType, exclusive_area_m2: v.exclusiveAreaM2, deposit: v.deposit,
    monthly_rent: v.monthlyRent, maintenance_fee: v.maintenanceFee, energy_cost: v.energyCost, electricity_kwh: v.electricityKwh,
    transit_fare: v.transitFare, trips_per_day: v.tripsPerDay, commute_days: v.commuteDays, updated_at: new Date().toISOString(),
  };
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("interest_homes").update(row).eq("id", id).eq("user_id", userId)
    : await supabase.from("interest_homes").insert({ ...row, user_id: userId, created_by: userId });
  if (error) return { error: "관심 주택을 저장하지 못했습니다. 잠시 뒤 다시 저장해 주세요.", values };
  revalidatePath("/compare");
  revalidatePath("/compare/cost");
  if (!id) redirect("/compare");
  return { saved: true, values };
}

/** 관심 주택 지우기. 내 것만(RLS interest_homes_delete_own) */
export async function deleteInterestHome(id: string): Promise<{ error?: string }> {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const supabase = await createClient();
  const { error } = await supabase.from("interest_homes").delete().eq("id", id).eq("user_id", userId);
  if (error) return { error: "지우지 못했습니다. 잠시 뒤 다시 해 주세요." };
  revalidatePath("/compare");
  revalidatePath("/compare/cost");
  redirect("/compare");
}
