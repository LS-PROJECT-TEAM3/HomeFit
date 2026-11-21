"use client";

import { useActionState, useState, useTransition } from "react";
import { FieldLabel, OptionGroup, UnitBox } from "@/app/_components/form-ui";
import { SavedNotice } from "@/app/_components/saved-notice";
import type { AreaFormInput } from "@/incident/area-form";
import { HOUSING_LABELS } from "@/incident/home-form";
import { SIDO_OPTIONS } from "@/watch/sido";
import { SigunguChecks } from "./sigungu-checks";
import { addArea, deleteArea, type AreaState } from "./actions";
import styles from "@/app/_components/form.module.css";
import local from "./areas.module.css";

const EMPTY: AreaFormInput = { sidoCode: "", sigunguCodes: [], housingType: "", targetArea: "", areaUnit: "m2", contractType: "" };

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className={styles.fieldError}>{message}</p> : null;
}

// IA MY_030300_TB 관심 지역 넣기 (spec 008 FR-001). 저장하면 빈 폼으로 돌아간다
export function AreaForm() {
  const [state, action, pending] = useActionState<AreaState, FormData>(addArea, {});
  const values = state.values ?? EMPTY;
  return <AreaFields key={JSON.stringify(state)} values={values} state={state} action={action} pending={pending} />;
}

type FieldsProps = { values: AreaFormInput; state: AreaState; action: (formData: FormData) => void; pending: boolean };

function AreaFields({ values, state, action, pending }: FieldsProps) {
  const [sidoCode, setSidoCode] = useState(values.sidoCode);
  const errors = state.errors ?? {};
  return (
    <form action={action} className={styles.form} noValidate>
      {state.error ? <p className={styles.alert} role="alert">{state.error}</p> : null}
      {state.saved ? <SavedNotice message={`관심 지역 ${state.saved}곳을 저장했습니다`} /> : null}
      <div className={styles.field}>
        <FieldLabel htmlFor="sidoCode" label="시도" required />
        <select id="sidoCode" name="sidoCode" value={sidoCode} onChange={(e) => setSidoCode(e.target.value)} className={styles.input}>
          <option value="">선택해 주세요</option>
          {SIDO_OPTIONS.map((sido) => <option key={sido.code} value={sido.code}>{sido.name}</option>)}
        </select>
      </div>
      <SigunguChecks key={sidoCode} sidoCode={sidoCode} initial={values.sidoCode === sidoCode ? values.sigunguCodes : []} error={errors.sigunguCodes} />
      {/* spec 022(v2-set-region-pc "비교할 집"): 주택 유형·계약 형태는 고르기 버튼, 기준 면적은 칸 안 단위 */}
      <OptionGroup name="housingType" label="주택 유형" required value={values.housingType} error={errors.housingType}
        options={Object.entries(HOUSING_LABELS).map(([value, label]) => ({ value, label: label.replaceAll("·", "/") }))} />
      <div className={styles.field}>
        <FieldLabel htmlFor="targetArea" label="기준 면적" required />
        <UnitBox unit={(
          <select name="areaUnit" aria-label="면적 단위" defaultValue={values.areaUnit}>
            <option value="m2">㎡</option>
            <option value="pyeong">평</option>
          </select>
        )}>
          <input id="targetArea" name="targetArea" inputMode="decimal" placeholder="예: 33" defaultValue={values.targetArea} className={styles.input}
            aria-invalid={Boolean(errors.targetArea)} aria-describedby="targetArea-help targetArea-error" />
        </UnitBox>
        <p id="targetArea-help" className={styles.help}>기준 면적의 ±20% 거래만 비교해요. 단독/다가구는 연면적으로 비교해요.</p>
        <FieldError id="targetArea-error" message={errors.targetArea} />
      </div>
      <OptionGroup name="contractType" label="계약 형태" required fill value={values.contractType} error={errors.contractType}
        options={[{ value: "jeonse", label: "전세" }, { value: "monthly", label: "월세" }]} />
      <div className={styles.actions}>
        <button type="submit" className={styles.primary} disabled={pending}>{pending ? "저장 중…" : "+ 지역 추가"}</button>
      </div>
    </form>
  );
}

export function DeleteAreaButton({ id, label }: { id: string; label: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button type="button" className={local.delete} disabled={pending} aria-label={`${label} 지우기`}
        onClick={() => startTransition(async () => setError((await deleteArea(id)).error ?? null))}>
        {pending ? "지우는 중…" : "지우기"}
      </button>
      {error ? <p className={styles.fieldError} role="alert">{error}</p> : null}
    </>
  );
}
