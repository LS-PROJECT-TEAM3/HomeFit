"use client";

import { useActionState, useState, useTransition } from "react";
import { CostFields, EMPTY_COSTS } from "@/app/_components/cost-fields";
import { filledStatus, Fold } from "@/app/_components/fold";
import { HOUSING_LABELS } from "@/incident/home-form";
import type { InterestHomeInput } from "@/incident/interest-home-form";
import { SIDO_OPTIONS } from "@/watch/sido";
import { SigunguField } from "../my/conditions/sigungu-field";
import { deleteInterestHome, saveInterestHome, type InterestHomeState } from "./actions";
import styles from "@/app/_components/form.module.css";

export const EMPTY_HOME: InterestHomeInput = {
  name: "", sidoCode: "", sigunguCode: "", housingType: "", exclusiveArea: "", areaUnit: "m2", deposit: "", monthlyRent: "", maintenanceFee: "", ...EMPTY_COSTS,
};

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className={styles.fieldError}>{message}</p> : null;
}

type TextName = "name" | "deposit" | "monthlyRent" | "maintenanceFee";

function TextField({ name, label, value, error, placeholder }: { name: TextName; label: string; value: string; error?: string; placeholder: string }) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={name}>{label}</label>
      <input id={name} name={name} inputMode={name === "name" ? "text" : "numeric"} placeholder={placeholder} defaultValue={value} className={styles.input}
        aria-invalid={Boolean(error)} aria-describedby={`${name}-error`} />
      <FieldError id={`${name}-error`} message={error} />
    </div>
  );
}

// IA CP_040100_PG 관심 주택 등록, CP_040300_PG 상세의 고치기 (spec 009 FR-001). id가 있으면 고치기
export function InterestHomeForm({ id, initial }: { id?: string; initial: InterestHomeInput }) {
  const [state, action, pending] = useActionState<InterestHomeState, FormData>(saveInterestHome, {});
  const values = state.values ?? initial;
  return <Fields key={JSON.stringify(values)} id={id} values={values} state={state} action={action} pending={pending} />;
}

type FieldsProps = { id?: string; values: InterestHomeInput; state: InterestHomeState; action: (formData: FormData) => void; pending: boolean };

function Fields({ id, values, state, action, pending }: FieldsProps) {
  const [sidoCode, setSidoCode] = useState(values.sidoCode);
  const errors = state.errors ?? {};
  return (
    <form action={action} className={styles.form} noValidate>
      {id ? <input type="hidden" name="id" value={id} /> : null}
      {state.error ? <p className={styles.alert} role="alert">{state.error}</p> : null}
      {state.saved ? <p className={styles.notice} role="status">저장했습니다.</p> : null}
      <TextField name="name" label="이름 (필수)" value={values.name} error={errors.name} placeholder="예: 역 앞 오피스텔" />
      <p className={styles.help}>상세 주소는 받지 않습니다. 내가 알아볼 이름만 넣으세요.</p>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="sidoCode">시도 (필수)</label>
        <select id="sidoCode" name="sidoCode" value={sidoCode} onChange={(e) => setSidoCode(e.target.value)} className={styles.input}>
          <option value="">고르세요</option>
          {SIDO_OPTIONS.map((sido) => <option key={sido.code} value={sido.code}>{sido.name}</option>)}
        </select>
      </div>
      <SigunguField key={sidoCode} sidoCode={sidoCode} initial={values.sidoCode === sidoCode ? values.sigunguCode : ""} error={errors.sigunguCode} label="시군구 (필수)" emptyLabel="고르세요" />
      <div className={styles.field}>
        <label className={styles.label} htmlFor="housingType">주택 유형 (필수)</label>
        <select id="housingType" name="housingType" defaultValue={values.housingType} className={styles.input} aria-invalid={Boolean(errors.housingType)} aria-describedby="housingType-error">
          <option value="">고르세요</option>
          {Object.entries(HOUSING_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </select>
        <FieldError id="housingType-error" message={errors.housingType} />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="exclusiveArea">전용면적 (선택)</label>
        <div className={styles.inline}>
          <input id="exclusiveArea" name="exclusiveArea" inputMode="decimal" placeholder="예: 20" defaultValue={values.exclusiveArea} className={styles.input}
            aria-invalid={Boolean(errors.exclusiveArea)} aria-describedby="exclusiveArea-error" />
          <select name="areaUnit" aria-label="면적 단위" defaultValue={values.areaUnit} className={styles.unit}>
            <option value="m2">㎡</option>
            <option value="pyeong">평</option>
          </select>
        </div>
        <FieldError id="exclusiveArea-error" message={errors.exclusiveArea} />
      </div>
      <TextField name="monthlyRent" label="월세 (원, 필수, 전세면 0)" value={values.monthlyRent} error={errors.monthlyRent} placeholder="예: 450000" />
      <TextField name="deposit" label="보증금 (원, 선택)" value={values.deposit} error={errors.deposit} placeholder="예: 5000000" />
      <TextField name="maintenanceFee" label="관리비 (원, 선택)" value={values.maintenanceFee} error={errors.maintenanceFee} placeholder="예: 70000" />
      <Fold title="실질 주거비 (선택)" status={filledStatus([values.energyCost, values.electricityKwh, values.transitFare, values.tripsPerDay, values.commuteDays])}
        open={["energyCost", "electricityKwh", "transitFare", "tripsPerDay", "commuteDays"].some((k) => Boolean(errors[k as keyof typeof errors]))}>
        <CostFields values={values} errors={errors} />
      </Fold>
      <button type="submit" className={styles.primary} disabled={pending}>{pending ? "저장 중…" : id ? "고친 내용 저장" : "관심 주택 저장"}</button>
    </form>
  );
}

export function DeleteInterestHome({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button type="button" className={styles.primary} disabled={pending} aria-label={`${name} 지우기`}
        onClick={() => {
          if (!window.confirm(`${name}을(를) 지울까요? 되돌릴 수 없습니다.`)) return;
          startTransition(async () => setError((await deleteInterestHome(id))?.error ?? null));
        }}>
        {pending ? "지우는 중…" : "이 관심 주택 지우기"}
      </button>
      {error ? <p className={styles.fieldError} role="alert">{error}</p> : null}
    </div>
  );
}
