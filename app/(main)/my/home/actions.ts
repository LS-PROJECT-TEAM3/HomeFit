"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseHomeForm, parseMeasurementForm, type HomeFormInput, type MeasurementFormInput } from "@/incident/home-form";
import { createClient, currentUserId } from "@/lib/supabase/server";

export type HomeState = {
  errors?: Partial<Record<"sigunguCode" | "housingType" | "exclusiveArea" | "windowType", string>>;
  error?: string;
  saved?: boolean;
  /** 저장하지 못했을 때 입력을 되살린다(React가 제출 뒤 폼을 비움) */
  values?: HomeFormInput;
};

export type MeasurementState = {
  errors?: Partial<Record<"temperature" | "humidity" | "measuredAt", string>>;
  error?: string;
  saved?: boolean;
  values?: MeasurementFormInput;
};

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}

/** FR-001 (spec 003): 내 집 저장. 회원당 하나라 user_id로 덮어쓴다. 서버 액션마다 로그인 확인 */
export async function saveHome(_prev: HomeState, formData: FormData): Promise<HomeState> {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const values: HomeFormInput = {
    sidoCode: text(formData, "sidoCode"), sigunguCode: text(formData, "sigunguCode"), housingType: text(formData, "housingType"),
    exclusiveArea: text(formData, "exclusiveArea"), areaUnit: text(formData, "areaUnit"), windowType: text(formData, "windowType"),
  };
  const parsed = parseHomeForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };

  const supabase = await createClient();
  const { error } = await supabase.from("homes").upsert(
    {
      user_id: userId, sigungu_code: parsed.value.sigunguCode, housing_type: parsed.value.housingType,
      exclusive_area_m2: parsed.value.exclusiveAreaM2, window_type: parsed.value.windowType,
      created_by: userId, updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { error: "내 집 정보를 저장하지 못했습니다. 잠시 뒤 다시 저장해 주세요.", values };
  revalidatePath("/my/home");
  return { saved: true, values };
}

/** FR-002 (spec 003): 실내 온습도 측정값 쌓기. 내 집이 있어야 한다 */
export async function addMeasurement(_prev: MeasurementState, formData: FormData): Promise<MeasurementState> {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const values: MeasurementFormInput = {
    temperature: text(formData, "temperature"), humidity: text(formData, "humidity"), measuredAt: text(formData, "measuredAt"),
  };
  const parsed = parseMeasurementForm(values, new Date());
  if (!parsed.ok) return { errors: parsed.errors, values };

  const supabase = await createClient();
  const { data: home, error: homeError } = await supabase.from("homes").select("id").eq("user_id", userId).maybeSingle();
  if (homeError) return { error: "내 집 정보를 불러오지 못했습니다. 잠시 뒤 다시 해 주세요.", values };
  if (!home) return { error: "내 집을 먼저 등록해 주세요.", values };

  const { error } = await supabase.from("indoor_measurements").insert({
    home_id: home.id, temperature_c: parsed.value.temperatureC, humidity_pct: parsed.value.humidityPct,
    measured_at: parsed.value.measuredAt, created_by: userId,
  });
  if (error) return { error: "측정값을 저장하지 못했습니다. 잠시 뒤 다시 저장해 주세요.", values };
  revalidatePath("/my/home");
  return { saved: true };
}
