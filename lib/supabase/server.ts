import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Database } from "@/lib/supabase/database.types";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * 서버 컴포넌트·서버 액션·Route Handler용 Supabase 접속. 로그인한 사용자 권한(RLS)으로 동작한다.
 * 근거: https://supabase.com/docs/guides/auth/server-side/creating-a-client
 */
export async function createClient() {
  // 로그인 확인이 현재 시각을 쓰므로 요청 때 그린다고 알린다(Next.js 16 Cache Components, blocking-prerender-current-time)
  await connection();
  const cookieStore = await cookies();
  return createServerClient<Database>(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // 서버 컴포넌트에서는 쿠키를 쓸 수 없다. 세션 새로 고침은 proxy.ts가 맡으므로 여기서는 무시해도 된다(Supabase 공식 안내).
        }
      },
    },
  });
}

/** 로그인한 사용자 ID. 권한 판단은 getClaims()로 한다 (getSession() 쓰지 않음) */
export async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return typeof data?.claims?.sub === "string" ? data.claims.sub : null;
}
