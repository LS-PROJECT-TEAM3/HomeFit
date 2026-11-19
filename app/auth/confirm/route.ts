import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/supabase/auth-rules";
import { createClient } from "@/lib/supabase/server";

/**
 * spec 014 FR-002·FR-003: 재설정 메일 링크가 돌아오는 곳. 코드를 세션으로 바꾸고 새 비밀번호 화면으로 보낸다.
 * 코드가 없거나 만료·이미 씀·다른 브라우저면 재설정 화면에 오류를 알린다(E6)
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  return NextResponse.redirect(new URL("/reset-password?error=link", request.url));
}
