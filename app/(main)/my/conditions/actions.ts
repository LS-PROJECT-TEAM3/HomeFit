"use server";

import { redirect } from "next/navigation";
import {
  parseConditionForm,
  type ConditionField,
  type ConditionFormInput,
} from "@/incident/condition-form";
import { createClient, currentUserId } from "@/lib/supabase/server";

export type ConditionState = {
  errors?: Partial<Record<ConditionField, string>>;
  error?: string;
  saved?: boolean;
  /** 저장하지 못했을 때 입력을 되살리려고 돌려준다(React가 제출 뒤 폼을 비우기 때문) */
  values?: ConditionFormInput;
};

function readForm(formData: FormData): ConditionFormInput {
  return {
    sidoCode: String(formData.get("sidoCode") ?? ""),
    sigunguCode: String(formData.get("sigunguCode") ?? ""),
    supplyTypes: formData.getAll("supplyTypes").map(String),
    targetGroups: formData.getAll("targetGroups").map(String),
    maxMonthlyRent: String(formData.get("maxMonthlyRent") ?? ""),
    age: String(formData.get("age") ?? ""),
  };
}

/** FR-002 (spec 001): 조건 저장. 서버 액션마다 로그인을 다시 확인한다 (react-best-practices server-auth-actions) */
export async function saveConditions(_prev: ConditionState, formData: FormData): Promise<ConditionState> {
  const userId = await currentUserId();
  if (!userId) redirect("/login");

  const values = readForm(formData);
  const parsed = parseConditionForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };

  const supabase = await createClient();
  const { error } = await supabase.from("policy_conditions").upsert({
    user_id: userId,
    sido_code: parsed.value.sidoCode,
    sigungu_code: parsed.value.sigunguCode,
    supply_types: [...parsed.value.supplyTypes],
    target_groups: [...parsed.value.targetGroups],
    max_monthly_rent: parsed.value.maxMonthlyRent,
    age: parsed.value.age,
    created_by: userId,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: "조건을 저장하지 못했습니다. 잠시 뒤 다시 저장해 주세요.", values };

  if (formData.get("next") === "/") redirect("/");
  return { saved: true, values };
}
