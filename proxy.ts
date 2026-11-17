import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

// 로그인 없이 열 수 있는 주소 (IA MB_010000_PG, MB_010100_PG)
const PUBLIC_PATHS = ["/login", "/signup"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * 요청마다 Supabase 세션을 새로 고치고, 로그인하지 않았으면 로그인 화면으로 보낸다 (FR-001, FR-014).
 * 실제 권한은 서버·DB(RLS)에서 다시 확인한다. 이것은 화면 단계의 1차 확인이다.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname } = request.nextUrl;

  if (!signedIn && !isPublic(pathname)) return redirectKeepingCookies(request, response, "/login");
  if (signedIn && isPublic(pathname)) return redirectKeepingCookies(request, response, "/");
  return response;
}

function redirectKeepingCookies(request: NextRequest, from: NextResponse, path: string) {
  const redirect = NextResponse.redirect(new URL(path, request.url));
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  // 정적 파일과 정기 수집 입구(/api/cron, CRON_SECRET으로 따로 보호)는 건너뛴다
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/cron).*)"],
};
