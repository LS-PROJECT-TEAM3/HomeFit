"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkDefectPhoto, defectPhotoPath, parseDefectForm, type DefectField, type DefectInput } from "@/incident/defect-form";
import { createClient, currentUserId } from "@/lib/supabase/server";
import { toKstDate } from "@/watch/kst";

export type DefectState = { errors?: Partial<Record<DefectField | "photo", string>>; error?: string; savedAt?: string; values?: DefectInput };

const BUCKET = "defect-photos";

async function myHomeId(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("homes").select("id").eq("user_id", userId).maybeSingle();
  if (error) throw new Error("내 집을 불러오지 못했습니다.");
  return data?.id ?? null;
}

/** spec 019 FR-002: 하자 기록 넣기. 사진은 저장소에 먼저 올리고, 기록 저장이 실패하면 올린 사진을 지운다(E6) */
export async function addDefectRecord(_prev: DefectState, formData: FormData): Promise<DefectState> {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const values: DefectInput = { occurredOn: String(formData.get("occurredOn") ?? ""), kind: String(formData.get("kind") ?? ""), memo: String(formData.get("memo") ?? "") };
  const parsed = parseDefectForm(values, toKstDate(new Date()));
  const photo = formData.get("photo");
  const photoCheck = photo instanceof File ? checkDefectPhoto(photo) : ({ ok: true, ext: null } as const);
  if (!parsed.ok || !photoCheck.ok) return { errors: { ...(parsed.ok ? {} : parsed.errors), ...(photoCheck.ok ? {} : { photo: photoCheck.error }) }, values };
  let homeId: string | null;
  try {
    homeId = await myHomeId(userId);
  } catch {
    return { error: "내 집을 불러오지 못했습니다. 잠시 뒤 다시 해 주세요.", values };
  }
  if (!homeId) return { error: "내 집을 먼저 등록해 주세요.", values };
  const supabase = await createClient();
  const path = photoCheck.ext && photo instanceof File ? defectPhotoPath(userId, randomUUID(), photoCheck.ext) : null;
  if (path && photo instanceof File) {
    const { error } = await supabase.storage.from(BUCKET).upload(path, photo, { contentType: photo.type });
    if (error) return { errors: { photo: "사진을 올리지 못했습니다. 잠시 뒤 다시 해 주세요." }, values };
  }
  const { error } = await supabase.from("defect_records").insert({ home_id: homeId, ...toRow(parsed.value), photo_path: path, created_by: userId });
  if (error) {
    if (path) await supabase.storage.from(BUCKET).remove([path]);
    return { error: "하자 기록을 저장하지 못했습니다. 잠시 뒤 다시 저장해 주세요.", values };
  }
  revalidatePath("/qc/records");
  return { savedAt: new Date().toISOString() };
}

function toRow(value: { occurredOn: string; kind: string; memo: string }) {
  return { occurred_on: value.occurredOn, kind: value.kind, memo: value.memo };
}

/** spec 019 FR-003: 하자 기록 지우기. 내 것만(RLS defect_records_delete_own), 사진도 함께 지운다 */
export async function deleteDefectRecord(id: string): Promise<{ error?: string }> {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const supabase = await createClient();
  const { data, error } = await supabase.from("defect_records").delete().eq("id", id).select("photo_path");
  if (error || !data?.length) return { error: "지우지 못했습니다. 잠시 뒤 다시 해 주세요." };
  const photo = data[0].photo_path;
  if (photo) await supabase.storage.from(BUCKET).remove([photo]);
  revalidatePath("/qc/records");
  return {};
}
