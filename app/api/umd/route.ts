import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/supabase/server";
import { fetchUmdList } from "@/watch/building.server";

/** spec 004 v0.4 FR-008: 건축물 조회 화면의 읍면동 목록. 로그인한 사람만 */
export async function GET(request: Request) {
  if (!(await currentUserId())) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const sigungu = new URL(request.url).searchParams.get("sigungu") ?? "";
  if (!/^\d{5}$/.test(sigungu)) return NextResponse.json({ error: "시군구를 골라 주세요." }, { status: 400 });
  try {
    return NextResponse.json({ items: await fetchUmdList(sigungu) });
  } catch {
    // 키·주소가 섞일 수 있어 오류 내용은 돌려주지 않는다 (PRD FR-27)
    return NextResponse.json({ error: "읍면동 목록을 불러오지 못했습니다." }, { status: 502 });
  }
}
