"use client";

import { useActionState, useState, useTransition } from "react";
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
        <label className={styles.label} htmlFor="sidoCode">시도 (필수)</label>
        <select id="sidoCode" name="sidoCode" value={sidoCode} onChange={(e) => setSidoCode(e.target.value)} className={styles.input}>
          <option value="">고르세요</option>
          {SIDO_OPTIONS.map((sido) => <option key={sido.code} value={sido.code}>{sido.name}</option>)}
        </select>
      </div>
      <SigunguChecks key={sidoCode} sidoCode={sidoCode} initial={values.sidoCode === sidoCode ? values.sigunguCodes : []} error={errors.sigunguCodes} />
      <div className={styles.field}>
        <label className={styles.label} htmlFor="housingType">주택 유형 (필수)</label>
        <select id="housingType" name="housingType" defaultValue={values.housingType} className={styles.input} aria-invalid={Boolean(errors.housingType)} aria-describedby="housingType-error">
          <option value="">고르세요</option>
          {Object.entries(HOUSING_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </select>
        <FieldError id="housingType-error" message={errors.housingType} />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="targetArea">기준 면적 (필수)</label>
        <div className={styles.inline}>
          <input id="targetArea" name="targetArea" inputMode="decimal" placeholder="예: 20" defaultValue={values.targetArea} className={styles.input}
            aria-invalid={Boolean(errors.targetArea)} aria-describedby="targetArea-help targetArea-error" />
          <select name="areaUnit" aria-label="면적 단위" defaultValue={values.areaUnit} className={styles.unit}>
            <option value="m2">㎡</option>
            <option value="pyeong">평</option>
          </select>
        </div>
        <p id="targetArea-help" className={styles.help}>이 면적의 ±20% 거래만 비교합니다. 단독·다가구는 연면적으로 비교합니다.</p>
        <FieldError id="targetArea-error" message={errors.targetArea} />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="contractType">계약 형태 (필수)</label>
        <select id="contractType" name="contractType" defaultValue={values.contractType} className={styles.input} aria-invalid={Boolean(errors.contractType)} aria-describedby="contractType-error">
          <option value="">고르세요</option>
          <option value="monthly">월세</option>
          <option value="jeonse">전세</option>
        </select>
        <FieldError id="contractType-error" message={errors.contractType} />
      </div>
      <button type="submit" className={styles.primary} disabled={pending}>{pending ? "저장 중…" : "관심 지역 추가"}</button>
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
