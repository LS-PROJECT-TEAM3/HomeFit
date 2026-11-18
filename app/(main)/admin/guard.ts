import { redirect } from "next/navigation";
import { createClient, currentUserId } from "@/lib/supabase/server";

/**
 * PRD FR-19, IA AD_070000_PG: 관리자만. 화면에서도 막고, 읽기는 DB 권한(RLS: 관리자 읽기만)이 한 번 더 막는다.
 * 관리자도 남의 사건을 대신 승인하지 못한다(승인 DB 함수가 본인 사건만 받음).
 */
export async function requireAdmin(): Promise<boolean> {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const { data, error } = await (await createClient()).rpc("is_admin");
  if (error) throw new Error("관리자인지 확인하지 못했습니다.");
  return data === true;
}
