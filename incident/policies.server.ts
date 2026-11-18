import { listMatchedPolicies, type MatchedPolicy, type PolicyFilter, type PolicyKind } from "@/incident/policy-match";
import { createClient, requireUserId } from "@/lib/supabase/server";
import type { Policy } from "@/watch/youth-policy";

export type PolicyListResult = { hasCondition: boolean; items: MatchedPolicy[] };

/**
 * spec 006 FR-003: 내 조건(지역·나이)에 맞는 청년 주거 정책. 저장하지 않고 그때그때 비교한다(맞춤 공고와 같은 방식).
 * 정책은 공개 자료라 로그인 사용자 모두 읽는다(마이그레이션 0005 source_items 읽기 권한).
 */
export async function listMyPolicies(today: string, kind?: PolicyKind): Promise<PolicyListResult> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const condition = await supabase.from("policy_conditions").select("sido_code, sigungu_code, age").eq("user_id", userId).maybeSingle();
  if (condition.error) throw new Error("조건을 불러오지 못했습니다.");
  if (!condition.data) return { hasCondition: false, items: [] };
  const filter: PolicyFilter = { sidoCode: condition.data.sido_code, sigunguCode: condition.data.sigungu_code, age: condition.data.age };
  const { data, error } = await supabase
    .from("source_items")
    .select("raw")
    .eq("source_code", "youth_policy")
    .or(`apply_end.is.null,apply_end.gte.${today}`)
    .limit(2000);
  if (error) throw new Error("정책을 불러오지 못했습니다.");
  const policies = data.map((row) => row.raw as unknown as Policy); // raw는 Policy로 저장했다 (watch/collect-youth.server.ts)
  return { hasCondition: true, items: listMatchedPolicies({ policies, condition: filter, today, kind }) };
}
