import type { DefectKind } from "@/incident/defect-form";
import { createClient } from "@/lib/supabase/server";

export type Defect = { id: string; occurredOn: string; kind: DefectKind; memo: string; photoUrl: string | null };

const PHOTO_URL_SECONDS = 600; // 본인 세션으로 만든 짧은 주소(spec 019 plan)

/** spec 019 FR-002·003: 내 집의 하자 기록과 사진 짧은 주소. 읽기 실패는 던진다 */
export async function loadDefects(userId: string): Promise<{ hasHome: boolean; defects: Defect[] }> {
  const supabase = await createClient();
  const { data: home, error: homeError } = await supabase.from("homes").select("id").eq("user_id", userId).maybeSingle();
  if (homeError) throw new Error("내 집을 불러오지 못했습니다.");
  if (!home) return { hasHome: false, defects: [] };
  const { data, error } = await supabase.from("defect_records").select("id, occurred_on, kind, memo, photo_path").eq("home_id", home.id).order("occurred_on", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw new Error("하자 기록을 불러오지 못했습니다.");
  const paths = data.map((r) => r.photo_path).filter((p): p is string => p !== null);
  const signed = paths.length ? (await supabase.storage.from("defect-photos").createSignedUrls(paths, PHOTO_URL_SECONDS)).data ?? [] : [];
  const urls = new Map(signed.map((s) => [s.path, s.signedUrl]));
  return { hasHome: true, defects: data.map((r) => ({ id: r.id, occurredOn: r.occurred_on, kind: r.kind as DefectKind, memo: r.memo, photoUrl: r.photo_path ? urls.get(r.photo_path) ?? null : null })) };
}
