"use client";

import { useActionState, useState } from "react";
import { HOUSING_LABELS, WINDOW_LABELS, type HomeFormInput } from "@/incident/home-form";
import { SIDO_OPTIONS } from "@/watch/sido";
import { CostFields, costInput } from "@/app/_components/cost-fields";
import { filledStatus, Fold } from "@/app/_components/fold";
import { SavedNotice } from "@/app/_components/saved-notice";
import { SigunguField } from "../conditions/sigungu-field";
import { saveHome, type HomeState } from "./actions";
import type { MyHome } from "./load";
import styles from "@/app/_components/form.module.css";


function toInput(home: MyHome | null): HomeFormInput {
  return {
    sidoCode: home?.sigunguCode.slice(0, 2) ?? "", sigunguCode: home?.sigunguCode ?? "", housingType: home?.housingType ?? "",
    exclusiveArea: home ? String(home.exclusiveAreaM2) : "", areaUnit: "m2", windowType: home?.windowType ?? "",
    contractType: home?.contractType ?? "", deposit: home?.deposit?.toString() ?? "", monthlyRent: home?.monthlyRent?.toString() ?? "",
    maintenanceFee: home?.maintenanceFee?.toString() ?? "", contractEndDate: home?.contractEndDate ?? "",
  };
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className={styles.fieldError}>{message}</p> : null;
}

// IA MY_030200_TB 내 집 (FR-001, spec 003)
export function HomeForm({ initial }: { initial: MyHome | null }) {
  const [state, action, pending] = useActionState<HomeState, FormData>(saveHome, {});
  const values = state.values ?? toInput(initial);
  const costs = state.costs ?? costInput(initial);
  return <HomeFields key={JSON.stringify([values, costs])} values={values} costs={costs} state={state} action={action} pending={pending} />;
}

// 사용자 요청(2026-11-17): 전용면적을 평으로도 넣는다. 저장은 ㎡, 저장된 값은 ㎡로 보여 준다
function AreaField({ value, unit, error }: { value: string; unit: string; error?: string }) {
  const [picked, setPicked] = useState(unit === "pyeong" ? "pyeong" : "m2");
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor="exclusiveArea">전용면적 (필수)</label>
      <div className={styles.inline}>
        <input id="exclusiveArea" name="exclusiveArea" inputMode="decimal" placeholder={picked === "pyeong" ? "예: 6" : "예: 20"}
          defaultValue={value} className={styles.input} aria-invalid={Boolean(error)} aria-describedby="exclusiveArea-help exclusiveArea-error" />
        <select name="areaUnit" aria-label="면적 단위" value={picked} onChange={(e) => setPicked(e.target.value)} className={styles.unit}>
          <option value="m2">㎡</option>
          <option value="pyeong">평</option>
        </select>
      </div>
      <p id="exclusiveArea-help" className={styles.help}>평으로 넣으면 ㎡로 바꿔 저장합니다(1평 ≈ 3.31㎡).</p>
      <FieldError id="exclusiveArea-error" message={error} />
    </div>
  );
}

// spec 003 v0.2 FR-001 수용 기준 6·7: 계약 칸(모두 선택). 홈 "나의 주거 정보"·"월 예상 주거비"에 쓰인다
function AmountField({ name, label, value, error }: { name: "deposit" | "monthlyRent" | "maintenanceFee"; label: string; value: string; error?: string }) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={name}>{label}</label>
      <input id={name} name={name} inputMode="numeric" placeholder="예: 450000" defaultValue={value} className={styles.input}
        aria-invalid={Boolean(error)} aria-describedby={`${name}-error`} />
      <FieldError id={`${name}-error`} message={error} />
    </div>
  );
}

function ContractFields({ values, errors }: { values: HomeFormInput; errors: NonNullable<HomeState["errors"]> }) {
  return (
    <>
      <p className={styles.help}>넣으면 홈에서 월 예상 주거비(월세 + 관리비)와 계약 만료까지 남은 날을 보여 드립니다.</p>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="contractType">계약 형태</label>
        <select id="contractType" name="contractType" defaultValue={values.contractType} className={styles.input}
          aria-invalid={Boolean(errors.contractType)} aria-describedby="contractType-error">
          <option value="">모름·나중에</option>
          <option value="monthly">월세</option>
          <option value="jeonse">전세</option>
        </select>
        <FieldError id="contractType-error" message={errors.contractType} />
      </div>
      <AmountField name="deposit" label="보증금 (원)" value={values.deposit} error={errors.deposit} />
      <AmountField name="monthlyRent" label="월세 (원, 전세면 비워 두세요)" value={values.monthlyRent} error={errors.monthlyRent} />
      <AmountField name="maintenanceFee" label="월 관리비 (원)" value={values.maintenanceFee} error={errors.maintenanceFee} />
      <div className={styles.field}>
        <label className={styles.label} htmlFor="contractEndDate">계약 만료일</label>
        <input id="contractEndDate" name="contractEndDate" type="date" defaultValue={values.contractEndDate} className={styles.input}
          aria-invalid={Boolean(errors.contractEndDate)} aria-describedby="contractEndDate-error" />
        <FieldError id="contractEndDate-error" message={errors.contractEndDate} />
      </div>
    </>
  );
}

// 사용자 요청(2026-11-18): 묶음마다 오류가 있으면 펼친다(접힌 칸의 오류를 놓치지 않게)
const BASIC_KEYS = ["sigunguCode", "housingType", "exclusiveArea", "windowType"] as const;
const CONTRACT_KEYS = ["contractType", "deposit", "monthlyRent", "maintenanceFee", "contractEndDate"] as const;
const COST_KEYS = ["energyCost", "electricityKwh", "transitFare", "tripsPerDay", "commuteDays"] as const;

function hasError(errors: NonNullable<HomeState["errors"]>, keys: readonly string[]): boolean {
  return keys.some((key) => Boolean((errors as Record<string, string | undefined>)[key]));
}

type FieldsProps = { values: HomeFormInput; costs: NonNullable<HomeState["costs"]>; state: HomeState; action: (formData: FormData) => void; pending: boolean };

function HomeFields({ values, costs, state, action, pending }: FieldsProps) {
  const [sidoCode, setSidoCode] = useState(values.sidoCode);
  const errors = state.errors ?? {};
  const basic = [values.sigunguCode, values.housingType, values.exclusiveArea, values.windowType];
  const basicDone = basic.every((v) => v.trim() !== "");
  return (
    <form action={action} className={styles.form} noValidate>
      {state.error ? <p className={styles.alert} role="alert">{state.error}</p> : null}
      {state.saved ? <SavedNotice /> : null}

      {/* 사용자 요청(2026-11-18): 필수 묶음은 다 채울 때까지 펼치고, 선택 묶음은 접어 둔다 */}
      <Fold title="기본 정보" status={filledStatus(basic)} open={!basicDone || hasError(errors, BASIC_KEYS)}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="sidoCode">시도 (필수)</label>
        <select id="sidoCode" name="sidoCode" value={sidoCode} onChange={(e) => setSidoCode(e.target.value)} className={styles.input}>
          <option value="">고르세요</option>
          {SIDO_OPTIONS.map((sido) => <option key={sido.code} value={sido.code}>{sido.name}</option>)}
        </select>
      </div>

      {/* 상세 주소는 받지 않는다. 시군구로 날씨 예보를 읽는다 (ERD homes.sigungu_code) */}
      <SigunguField sidoCode={sidoCode} initial={values.sigunguCode} error={errors.sigunguCode} label="시군구 (필수)" emptyLabel="고르세요" />

      <div className={styles.field}>
        <label className={styles.label} htmlFor="housingType">주택 유형 (필수)</label>
        <select id="housingType" name="housingType" defaultValue={values.housingType} className={styles.input}
          aria-invalid={Boolean(errors.housingType)} aria-describedby="housingType-error">
          <option value="">고르세요</option>
          {Object.entries(HOUSING_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <FieldError id="housingType-error" message={errors.housingType} />
      </div>

      <AreaField value={values.exclusiveArea} unit={values.areaUnit} error={errors.exclusiveArea} />

      <fieldset className={styles.checks} aria-describedby="windowType-help windowType-error">
        <legend className={styles.label}>창 종류 (필수)</legend>
        {Object.entries(WINDOW_LABELS).map(([value, label]) => (
          <label key={value} className={styles.check}>
            <input type="radio" name="windowType" value={value} defaultChecked={values.windowType === value} /> {label}
          </label>
        ))}
        <p id="windowType-help" className={styles.help}>모르면 &lsquo;모름&rsquo;을 고르세요. 더 조심해야 하는 홑유리로 계산합니다.</p>
        <FieldError id="windowType-error" message={errors.windowType} />
      </fieldset>
      </Fold>

      <Fold title="계약 정보" status={filledStatus(CONTRACT_KEYS.map((k) => values[k]))} open={hasError(errors, CONTRACT_KEYS)}>
        <ContractFields values={values} errors={errors} />
      </Fold>
      {/* spec 009 FR-002: 집 비교의 내 집 줄 */}
      <Fold title="관리비/에너지비/교통비" status={filledStatus(COST_KEYS.map((k) => costs[k]))} open={hasError(errors, COST_KEYS)}>
        <CostFields values={costs} errors={errors} />
      </Fold>

      <div className={styles.actions}>
        <button type="reset" className={styles.assistive}>취소</button>
        <button type="submit" className={styles.primary} disabled={pending}>{pending ? "저장 중…" : "저장"}</button>
      </div>
    </form>
  );
}
