import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { supabaseUrl } from "@/lib/supabase/env";

/**
 * secret 키 접속(RLS 우회). 정기 수집처럼 사용자 없이 도는 서버 코드에서만 쓴다.
 * 화면 코드에서 import하지 않는다 (plan 001 §5 보안, PRD FR-27)
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) {
    throw new Error("SUPABASE_SECRET_KEY 환경변수가 없습니다. Supabase 대시보드의 Secret keys 값을 .env.local에 넣어 주세요.");
  }
  return createClient<Database>(supabaseUrl(), key, { auth: { persistSession: false } });
}

export type AdminClient = ReturnType<typeof createAdminClient>;
