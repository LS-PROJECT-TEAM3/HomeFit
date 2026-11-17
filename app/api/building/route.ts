import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/supabase/server";
import { parseBuildingQuery } from "@/watch/building";
import { fetchBuildingTitles } from "@/watch/building.server";

/**
 * spec 004 v0.4 FR-008, PRD v1.8 FR-34: 건축물대장 표제부 조회. 로그인한 사람만, 저장하지 않는다.
 * 번지가 주소창·서버 기록에 남지 않게 본문(POST)으로 받는다
 */
export async function POST(request: Request) {
  if (!(await currentUserId())) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const field = (name: string) => (typeof body?.[name] === "string" ? (body[name] as string) : "");
  const parsed = parseBuildingQuery({ sigunguCode: field("sigungu"), bjdongCode: field("bjdong"), bun: field("bun"), ji: field("ji") });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    return NextResponse.json({ items: await fetchBuildingTitles(parsed.value) });
  } catch {
    return NextResponse.json({ error: "건축물대장을 불러오지 못했습니다. 잠시 뒤 다시 조회해 주세요." }, { status: 502 });
  }
}
