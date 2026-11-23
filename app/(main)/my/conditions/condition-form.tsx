"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { SUPPLY_TYPES } from "@/incident/notice-list";
import { SavedNotice } from "@/app/_components/saved-notice";
import { useFirstError } from "@/app/_components/use-first-error";
import type { ConditionFormInput } from "@/incident/condition-form";
import type { PolicyCondition } from "@/incident/match";
import { filledStatus, Fold, FoldMemoryProvider } from "@/app/_components/fold";
import { ChipGroup } from "@/app/_components/chip-group";
import { FieldLabel, UnitBox } from "@/app/_components/form-ui";
import { SIDO_OPTIONS } from "@/watch/sido";
import { saveConditions, type ConditionState } from "./actions";
import { SigunguField } from "./sigungu-field";
import styles from "@/app/_components/form.module.css";

// 마이홈 실제 응답의 공급 유형 이름 (spec 001 Q6). "모두"가 기본값
// ERD policy_conditions.target_groups 값과 화면 이름 (GLOSSARY 대상)
const TARGET_OPTIONS = [["youth", "청년/사회초년생"], ["newlywed", "신혼/신생아"], ["multichild", "다자녀"], ["elderly", "고령자"]] as const;
const SUPPLY_CHIPS = SUPPLY_TYPES.map((type) => ({ value: type, label: type }));
const TARGET_CHIPS = TARGET_OPTIONS.map(([value, label]) => ({ value, label }));
const picks = (n: number, total: number) => (n === 0 || n === total ? "모두" : `${n}개 선택`);

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
  return (
    <FoldMemoryProvider>
      <ConditionFields key={JSON.stringify(values)} values={values} errors={errors} state={state} action={action} pending={pending} next={next} submitLabel={submitLabel} />
    </FoldMemoryProvider>
  );
}

type FieldsProps = {
  values: ConditionFormInput; errors: NonNullable<ConditionState["errors"]>; state: ConditionState;
  action: (formData: FormData) => void; pending: boolean; next: Props["next"]; submitLabel: string;
};

function ConditionFields({ values, errors, state, action, pending, next, submitLabel }: FieldsProps) {
  // FR-002 (spec 001 v0.3): 시도에 따라 시군구 목록이 바뀐다
  const [sidoCode, setSidoCode] = useState(values.sidoCode);
  const picked = values.supplyTypes;
  const [supplyCount, setSupplyCount] = useState(picked.includes("ALL") ? SUPPLY_CHIPS.length : picked.length);
  const [targetCount, setTargetCount] = useState(values.targetGroups.length);
  // 사용자 요청(2026-11-23): 설정에서는 묶음을 접어 두고 첫 설정(next "/")에서는 펼친다. 오류가 있는 묶음은 늘 펼친다
  const expand = next === "/";
  const formRef = useRef<HTMLFormElement>(null);
  useFirstError(formRef, errors);
  return (
    <form ref={formRef} action={action} className={styles.form} noValidate>
      <input type="hidden" name="next" value={next} />
      {state.error ? <p className={styles.alert} role="alert">{state.error}</p> : null}
      {state.saved ? <SavedNotice /> : null}
      {/* 사용자 요청(2026-11-23): "* 필수 입력"은 아래 버튼 줄 대신 맨 위에 */}
      <p className={styles.actionsNote}><span className={styles.req} aria-hidden="true">*</span> 필수 입력</p>

      {/* 사용자 요청(2026-11-23): 캔버스 흐름1 s2 보드대로 지역 / 공급 유형 / 대상 / 기본 조건 네 묶음. 여러 개 고르기는 "전체 선택" + 체크 칩 */}
      <Fold title="지역" mark="required" status={filledStatus([sidoCode, values.sigunguCode])} open={expand || Boolean(errors.sidoCode || errors.sigunguCode)}>
      <div className={styles.field}>
        <FieldLabel htmlFor="sidoCode" label="시도" required />
        <select id="sidoCode" name="sidoCode" value={sidoCode} onChange={(e) => setSidoCode(e.target.value)} className={styles.input}
          aria-invalid={Boolean(errors.sidoCode)} aria-describedby="sidoCode-error">
          <option value="">선택해 주세요</option>
          {SIDO_OPTIONS.map((sido) => <option key={sido.code} value={sido.code}>{sido.name}</option>)}
        </select>
        <FieldError id="sidoCode-error" message={errors.sidoCode} />
      </div>

      {/* Q18 해결(spec 001 v0.3): 법정동코드 API의 시군구 목록 */}
      <SigunguField sidoCode={sidoCode} initial={values.sigunguCode} error={errors.sigunguCode}
        label={<>시군구<span className={styles.optional}>(선택)</span></>} />
      </Fold>

      {/* 마이홈 공급 유형. 모두 고르거나 모두 끄면 "모두"(ALL)로 저장된다(incident/condition-form.ts) */}
      <Fold title="공급 유형" mark="required" status={picks(supplyCount, SUPPLY_CHIPS.length)} open={expand}>
        <ChipGroup name="supplyTypes" legend="공급 유형" options={SUPPLY_CHIPS} initial={picked} allValue="ALL" onCount={setSupplyCount}
          help="여러 개 고를 수 있어요. 모두 끄면 모든 유형을 보여요." />
      </Fold>

      {/* spec 001 v0.6 대상: 공고 제목으로 거른다. 자격 판정이 아니다 (GLOSSARY 대상) */}
      <Fold title="대상" mark="optional" status={picks(targetCount, TARGET_CHIPS.length)} open={expand}>
        <ChipGroup name="targetGroups" legend="대상" options={TARGET_CHIPS} initial={values.targetGroups} onCount={setTargetCount}
          help="여러 개 고를 수 있어요. 해당되는지는 공고문에서 확인해 주세요." />
      </Fold>

      <Fold title="기본 조건" mark="optional" status={filledStatus([values.maxMonthlyRent, values.age])} open={expand || Boolean(errors.maxMonthlyRent || errors.age)}>
      <div className={styles.field}>
        <FieldLabel htmlFor="maxMonthlyRent" label="임대료 상한" />
        <UnitBox unit="원 이하">
          <input id="maxMonthlyRent" name="maxMonthlyRent" inputMode="numeric" placeholder="예: 500,000"
            defaultValue={values.maxMonthlyRent} className={styles.input}
            aria-invalid={Boolean(errors.maxMonthlyRent)} aria-describedby="maxMonthlyRent-help maxMonthlyRent-error" />
        </UnitBox>
        <p id="maxMonthlyRent-help" className={styles.help}>한 달 임대료 기준</p>
        <FieldError id="maxMonthlyRent-error" message={errors.maxMonthlyRent} />
      </div>

      <div className={styles.field}>
        <FieldLabel htmlFor="age" label="나이" />
        <UnitBox unit="세">
          <input id="age" name="age" inputMode="numeric" placeholder="예: 27" defaultValue={values.age}
            className={styles.input} aria-invalid={Boolean(errors.age)} aria-describedby="age-help age-error" />
        </UnitBox>
        <p id="age-help" className={styles.help}>만 나이로 넣어 주세요</p>
        <FieldError id="age-error" message={errors.age} />
      </div>
      </Fold>

      {next === "/" ? (
        // spec 022(v2-s2-open-pc): 첫 설정 2단계는 아래에 붙는 "이전 · 2 / 2 단계 · 다음" 줄
        <div className={styles.stepBar}>
          <span className={styles.stepLeft}><Link href="/onboarding?step=1" className={styles.assistive}>← 이전</Link><span className={styles.stepCount}>2 / 2 단계</span></span>
          <button type="submit" className={styles.primary} disabled={pending}>{pending ? "저장 중…" : submitLabel}</button>
        </div>
      ) : (
        <div className={styles.actions}>
          <button type="reset" className={styles.assistive}>취소</button>
          <button type="submit" className={styles.primary} disabled={pending}>
            {pending ? "저장 중…" : submitLabel}
          </button>
        </div>
      )}
    </form>
  );
}
