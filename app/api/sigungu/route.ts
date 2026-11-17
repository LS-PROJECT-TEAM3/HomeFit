import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/supabase/server";
import { isKnownSidoCode } from "@/watch/sido";
import { fetchSigunguList } from "@/watch/region.server";

/** FR-002 (spec 001 v0.3): 조건 화면이 고른 시도의 시군구 목록을 받는다. 로그인한 사람만 */
export async function GET(request: Request) {
  if (!(await currentUserId())) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const sido = new URL(request.url).searchParams.get("sido") ?? "";
  if (!isKnownSidoCode(sido)) return NextResponse.json({ error: "알 수 없는 시도입니다." }, { status: 400 });
  try {
    return NextResponse.json({ items: await fetchSigunguList(sido) });
  } catch {
    // 키·주소가 섞일 수 있어 오류 내용은 돌려주지 않는다 (PRD FR-27)
    return NextResponse.json({ error: "시군구 목록을 불러오지 못했습니다." }, { status: 502 });
  }
}
