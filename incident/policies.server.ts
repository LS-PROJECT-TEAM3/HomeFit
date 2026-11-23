import type { PolicyCondition, TargetGroup } from "@/incident/match";
import { applyOverride, type ConditionOverride } from "@/incident/notice-list";
import { listMatchedPolicies, matchesPolicyTargets, policyTargetCounts, type MatchedPolicy } from "@/incident/policy-match";
import { createClient, requireUserId } from "@/lib/supabase/server";
import type { Policy } from "@/watch/youth-policy";

export type PolicyListResult =
  | { hasCondition: false; items: [] }
  | { hasCondition: true; items: MatchedPolicy[]; condition: PolicyCondition; targetCounts: Record<TargetGroup, number> };

/**
 * spec 006 FR-003: 내 조건(지역·나이)에 맞는 청년 주거 정책. 저장하지 않고 그때그때 비교한다(맞춤 공고와 같은 방식).
 * 정책은 공개 자료라 로그인 사용자 모두 읽는다(마이그레이션 0005 source_items 읽기 권한).
 * spec 022(v2-s3b-pc): override는 목록에서 잠깐 바꾼 조건, 대상 칩(targetGroups)으로도 거른다. 종류 거르기는 화면에서
 */
export async function listMyPolicies(today: string, override: ConditionOverride = {}): Promise<PolicyListResult> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const saved = await supabase.from("policy_conditions").select("sido_code, sigungu_code, supply_types, max_monthly_rent, age, target_groups").eq("user_id", userId).maybeSingle();
  if (saved.error) throw new Error("조건을 불러오지 못했습니다.");
  if (!saved.data) return { hasCondition: false, items: [] };
  const condition = applyOverride({
    sidoCode: saved.data.sido_code, sigunguCode: saved.data.sigungu_code, supplyTypes: saved.data.supply_types,
    maxMonthlyRent: saved.data.max_monthly_rent, age: saved.data.age, targetGroups: saved.data.target_groups as TargetGroup[],
  }, override);
  const { data, error } = await supabase
    .from("source_items")
    .select("raw")
    .eq("source_code", "youth_policy")
    .or(`apply_end.is.null,apply_end.gte.${today}`)
    .limit(2000);
  if (error) throw new Error("정책을 불러오지 못했습니다.");
  const policies = data.map((row) => row.raw as unknown as Policy); // raw는 Policy로 저장했다 (watch/collect-youth.server.ts)
  const matched = listMatchedPolicies({ policies, condition: { sidoCode: condition.sidoCode, sigunguCode: condition.sigunguCode, age: condition.age }, today });
  return {
    hasCondition: true, condition,
    items: matched.filter((m) => matchesPolicyTargets(m.policy, condition.targetGroups)),
    targetCounts: policyTargetCounts(matched.map((m) => m.policy)),
  };
}

/** spec 006 v0.3 FR-007: 정책 한 건(원문 값). 없으면 null */
export async function getPolicy(externalId: string): Promise<Policy | null> {
  await requireUserId();
  const supabase = await createClient();
  const { data, error } = await supabase.from("source_items").select("raw").eq("source_code", "youth_policy").eq("external_id", externalId).maybeSingle();
  if (error) throw new Error("정책을 불러오지 못했습니다.");
  return data ? (data.raw as unknown as Policy) : null;
}
