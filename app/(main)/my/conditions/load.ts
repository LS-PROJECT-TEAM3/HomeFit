import type { PolicyCondition, TargetGroup } from "@/incident/match";
import { createClient } from "@/lib/supabase/server";

/** 내 공고·정책 조건 읽기. 없으면 null, 읽기 실패는 던진다(빈 값으로 숨기지 않음) */
export async function loadMyCondition(userId: string): Promise<PolicyCondition | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("policy_conditions")
    .select("sido_code, sigungu_code, supply_types, max_monthly_rent, age, target_groups")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("조건을 불러오지 못했습니다.");
  if (!data) return null;
  return {
    sidoCode: data.sido_code,
    sigunguCode: data.sigungu_code,
    supplyTypes: data.supply_types,
    targetGroups: data.target_groups as TargetGroup[],
    maxMonthlyRent: data.max_monthly_rent,
    age: data.age,
  };
}
