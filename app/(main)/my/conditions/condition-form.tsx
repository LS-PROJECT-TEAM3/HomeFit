"use client";

import { useActionState, useState } from "react";
import { SUPPLY_TYPES } from "@/incident/notice-list";
import { SavedNotice } from "@/app/_components/saved-notice";
import type { ConditionFormInput } from "@/incident/condition-form";
import type { PolicyCondition } from "@/incident/match";
import { filledStatus, Fold } from "@/app/_components/fold";
import { SIDO_OPTIONS } from "@/watch/sido";
import { saveConditions, type ConditionState } from "./actions";
import { SigunguField } from "./sigungu-field";
import styles from "@/app/_components/form.module.css";

// 마이홈 실제 응답의 공급 유형 이름 (spec 001 Q6). "모두"가 기본값
// ERD policy_conditions.target_groups 값과 화면 이름 (GLOSSARY 대상)
const TARGET_OPTIONS = [["youth", "청년·사회초년생"], ["newlywed", "신혼·신생아"], ["multichild", "다자녀"], ["elderly", "고령자"]] as const;

type Props = { initial: PolicyCondition | null; next: "/" | "stay"; submitLabel: string };

// 저장된 조건을 폼 칸 값으로 바꾼다
function toInput(condition: PolicyCondition | null): ConditionFormInput {
  return {
    sidoCode: condition?.sidoCode ?? "",
    sigunguCode: condition?.sigunguCode ?? "",
    supplyTypes: condition?.supplyTypes ?? ["ALL"],
    targetGroups: condition?.targetGroups ?? [],
    maxMonthlyRent: condition?.maxMonthlyRent?.toString() ?? "",
    age: condition?.age?.toString() ?? "",
  };
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className={styles.fieldError}>
      {message}
    </p>
  ) : null;
}

// IA MB_010200_PG 첫 설정, MY_030100_TB 공고·정책 조건 (FR-002, spec 001)
export function ConditionForm({ initial, next, submitLabel }: Props) {
  const [state, action, pending] = useActionState<ConditionState, FormData>(saveConditions, {});
  const errors = state.errors ?? {};
  // 제출 뒤 React가 폼을 비우므로, 서버가 돌려준 입력(없으면 저장된 조건)으로 다시 채운다
  const values = state.values ?? toInput(initial);
  return <ConditionFields key={JSON.stringify(values)} values={values} errors={errors} state={state} action={action} pending={pending} next={next} submitLabel={submitLabel} />;
}

type FieldsProps = {
  values: ConditionFormInput; errors: NonNullable<ConditionState["errors"]>; state: ConditionState;
  action: (formData: FormData) => void; pending: boolean; next: Props["next"]; submitLabel: string;
};

function ConditionFields({ values, errors, state, action, pending, next, submitLabel }: FieldsProps) {
  // FR-002 (spec 001 v0.3): 시도에 따라 시군구 목록이 바뀐다
  const [sidoCode, setSidoCode] = useState(values.sidoCode);
  const picked = values.supplyTypes;
  return (
    <form action={action} className={styles.form} noValidate>
      <input type="hidden" name="next" value={next} />
      {state.error ? <p className={styles.alert} role="alert">{state.error}</p> : null}
      {state.saved ? <SavedNotice /> : null}

      {/* spec 022(캔버스 v2-set-cond-pc): 지역과 공급 유형 / 기본 조건 / 대상 세 묶음, 모두 펼쳐 둔다 */}
      <Fold title="지역과 공급 유형" status={filledStatus([sidoCode, values.sigunguCode, picked.includes("ALL") ? "" : picked.join()])} open>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="sidoCode">시도 (필수)</label>
        <select id="sidoCode" name="sidoCode" value={sidoCode} onChange={(e) => setSidoCode(e.target.value)} className={styles.input}
          aria-invalid={Boolean(errors.sidoCode)} aria-describedby="sidoCode-error">
          <option value="">고르세요</option>
          {SIDO_OPTIONS.map((sido) => <option key={sido.code} value={sido.code}>{sido.name}</option>)}
        </select>
        <FieldError id="sidoCode-error" message={errors.sidoCode} />
      </div>

      {/* Q18 해결(spec 001 v0.3): 법정동코드 API의 시군구 목록 */}
      <SigunguField sidoCode={sidoCode} initial={values.sigunguCode} error={errors.sigunguCode} />

      <fieldset className={styles.checks}>
        <legend className={styles.label}>공급 유형</legend>
        <label className={styles.check}>
          <input type="checkbox" name="supplyTypes" value="ALL" defaultChecked={picked.includes("ALL")} /> 모두
        </label>
        {SUPPLY_TYPES.map((type) => (
          <label key={type} className={styles.check}>
            <input type="checkbox" name="supplyTypes" value={type} defaultChecked={picked.includes(type)} /> {type}
          </label>
        ))}
      </fieldset>
      </Fold>

      <Fold title="기본 조건" status={filledStatus([values.maxMonthlyRent, values.age])} open>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="maxMonthlyRent">월 임대료 상한 (원, 선택)</label>
        <input id="maxMonthlyRent" name="maxMonthlyRent" inputMode="numeric" placeholder="예: 300000"
          defaultValue={values.maxMonthlyRent} className={styles.input}
          aria-invalid={Boolean(errors.maxMonthlyRent)} aria-describedby="maxMonthlyRent-error" />
        <FieldError id="maxMonthlyRent-error" message={errors.maxMonthlyRent} />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="age">나이 (선택)</label>
        <input id="age" name="age" inputMode="numeric" placeholder="예: 26" defaultValue={values.age}
          className={styles.input} aria-invalid={Boolean(errors.age)} aria-describedby="age-error" />
        <FieldError id="age-error" message={errors.age} />
      </div>

      </Fold>

      {/* spec 001 v0.6 대상: 공고 제목으로 거른다. 자격 판정이 아니다 (GLOSSARY 대상) */}
      <Fold title="대상" status={values.targetGroups.length ? `선택함 ${values.targetGroups.length}개` : "모두"} open>
      <fieldset className={styles.checks}>
        <legend className={styles.label}>대상 (선택)</legend>
        {TARGET_OPTIONS.map(([value, label]) => (
          <label key={value} className={styles.check}>
            <input type="checkbox" name="targetGroups" value={value} defaultChecked={values.targetGroups.includes(value)} /> {label}
          </label>
        ))}
        <p className={styles.help}>고르면 다른 대상만 적힌 공고(예: 신혼·신생아 전세임대)를 숨깁니다. 비우면 모두 보입니다. 자격은 공고문에서 확인해 주세요.</p>
      </fieldset>
      </Fold>

      <div className={styles.actions}>
        <button type="reset" className={styles.assistive}>취소</button>
        <button type="submit" className={styles.primary} disabled={pending}>
          {pending ? "저장 중…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
