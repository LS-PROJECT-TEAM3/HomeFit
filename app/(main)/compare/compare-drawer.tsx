"use client";

import { useActionState, useEffect, useState, type ReactNode, type RefObject } from "react";
import { Icon } from "@/app/_components/icons";
import { InfoTip } from "@/app/_components/info-tip";
import { HOUSING_LABELS } from "@/incident/home-form";
import { foldStatus, type InterestHomeField, type InterestHomeInput } from "@/incident/interest-home-form";
import { monthlyTransit } from "@/incident/real-cost";
import { SIDO_OPTIONS } from "@/watch/sido";
import { SigunguField } from "../my/conditions/sigungu-field";
import { saveInterestHome, type InterestHomeState } from "./actions";
import styles from "./compare.module.css";

// spec 022 FR-011, 캔버스 v2-compare-form-open·closed: 관심 주택 등록·고치기 옆 창(IA CP_040100_PG·CP_040300_PG를 합침)
// 도시가스 칸은 DB에 없어 넣지 않고, 계산에 쓰는 "월 에너지비" 칸을 그 자리에 둔다. 보증금은 선택(현경 결정 2026-11-21)

export type DrawerTarget = { mode: "new" } | { mode: "edit"; id: string; input: InterestHomeInput; focus?: "transit" };

type Section = "basic" | "contract" | "fee" | "transit";
type Errors = Partial<Record<InterestHomeField, string>>;
type SetValue = (name: keyof InterestHomeInput, value: string) => void;

const SECTION_FIELDS: Record<Section, InterestHomeField[]> = {
  basic: ["name", "sigunguCode", "housingType", "exclusiveArea"],
  contract: ["deposit", "monthlyRent"],
  fee: ["maintenanceFee", "electricityKwh", "energyCost"],
  transit: ["transitFare", "tripsPerDay", "commuteDays"],
};

const num = (raw: string) => (/^\d+(\.\d+)?$/.test(raw.trim()) ? Number(raw) : null);

function Label({ text, required, optional, htmlFor, tip }: { text: string; required?: boolean; optional?: boolean; htmlFor: string; tip?: string }) {
  return (
    <span className={styles.fieldLabel}>
      <label htmlFor={htmlFor}>{text}</label>
      {required ? <><span aria-hidden="true" className={styles.required}>*</span><span className={styles.srOnly}>필수</span></> : null}
      {optional ? <span className={styles.optional}>(선택)</span> : null}
      {tip ? <InfoTip text={tip} label={`${text} 설명 보기`} /> : null}
    </span>
  );
}

function NumberField({ name, label, unit, values, errors, set, required, optional, placeholder, className }: {
  name: keyof InterestHomeInput; label: string; unit: string; values: InterestHomeInput; errors: Errors; set: SetValue; required?: boolean; optional?: boolean; placeholder?: string; className?: string;
}) {
  const error = errors[name as InterestHomeField];
  return (
    <div className={`${styles.field} ${className ?? ""}`}>
      <Label text={label} required={required} optional={optional} htmlFor={name} />
      <div className={styles.inputBox}>
        <input id={name} name={name} inputMode="numeric" value={values[name]} placeholder={placeholder} onChange={(e) => set(name, e.target.value)}
          className={styles.input} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined} />
        <span className={styles.unitText} aria-hidden="true">{unit}</span>
      </div>
      {error ? <p id={`${name}-error`} className={styles.fieldError}>{error}</p> : null}
    </div>
  );
}

function FoldSection({ title, optional, status, open, children }: { title: string; optional?: boolean; status: { text: string; warn: boolean }; open: boolean; children: ReactNode }) {
  return (
    <details className={styles.fold} open={open}>
      <summary className={styles.foldSummary}>
        <span className={styles.foldTitle}>{title}{optional ? <span className={styles.badgeOptional}>선택</span> : null}</span>
        <span className={status.warn ? styles.foldWarn : styles.foldStatus}>{status.text}</span>
        <span className={styles.foldChevron}><Icon name="chevron-down" size={22} /></span>
      </summary>
      <div className={styles.foldBody}>{children}</div>
    </details>
  );
}

function BasicFields({ values, errors, set }: { values: InterestHomeInput; errors: Errors; set: SetValue }) {
  return (
    <div className={styles.grid2}>
      <div className={`${styles.field} ${styles.full}`}>
        <Label text="이름" required htmlFor="name" tip="내가 알아볼 이름만 적어요. 상세 주소는 받지 않아요." />
        <input id="name" name="name" value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="예: 역 앞 오피스텔" className={styles.input}
          aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-error" : undefined} />
        {errors.name ? <p id="name-error" className={styles.fieldError}>{errors.name}</p> : null}
      </div>
      <div className={styles.field}>
        <Label text="시도" required htmlFor="sidoCode" />
        <select id="sidoCode" name="sidoCode" value={values.sidoCode} onChange={(e) => { set("sidoCode", e.target.value); set("sigunguCode", ""); }} className={styles.input}>
          <option value="">고르세요</option>
          {SIDO_OPTIONS.map((sido) => <option key={sido.code} value={sido.code}>{sido.name}</option>)}
        </select>
      </div>
      <SigunguField key={values.sidoCode} sidoCode={values.sidoCode} initial={values.sigunguCode.startsWith(values.sidoCode) ? values.sigunguCode : ""} error={errors.sigunguCode}
        label={<>시군구<span aria-hidden="true" className={styles.required}>*</span><span className={styles.srOnly}>필수</span></>} emptyLabel="고르세요"
        onPick={(code) => set("sigunguCode", code)} classes={{ field: styles.field, label: styles.fieldLabel, input: styles.input, help: styles.help }} />
      <NumberField name="exclusiveArea" label="전용면적" unit="㎡" optional values={values} errors={errors} set={set} placeholder="예: 24" className={styles.narrow} />
      <input type="hidden" name="areaUnit" value="m2" />
      <fieldset className={`${styles.field} ${styles.full} ${styles.fieldset}`} aria-describedby={errors.housingType ? "housingType-error" : undefined}>
        <legend className={styles.fieldLabel}>주택 유형<span aria-hidden="true" className={styles.required}>*</span><span className={styles.srOnly}>필수</span></legend>
        <div className={styles.options}>
          {Object.entries(HOUSING_LABELS).map(([code, label]) => (
            <label key={code} className={`${styles.option} ${values.housingType === code ? styles.optionActive : ""}`}>
              <input type="radio" name="housingType" value={code} checked={values.housingType === code} onChange={() => set("housingType", code)} className={styles.srOnly} />
              {label}
            </label>
          ))}
        </div>
        {errors.housingType ? <p id="housingType-error" className={styles.fieldError}>{errors.housingType}</p> : null}
      </fieldset>
    </div>
  );
}

function TransitFields({ values, errors, set }: { values: InterestHomeInput; errors: Errors; set: SetValue }) {
  const monthly = monthlyTransit(num(values.transitFare), num(values.tripsPerDay), num(values.commuteDays));
  return (
    <div className={styles.grid2}>
      <NumberField name="transitFare" label="편도 요금" unit="원" values={values} errors={errors} set={set} placeholder="예: 1500" />
      <NumberField name="tripsPerDay" label="하루 횟수" unit="번" values={values} errors={errors} set={set} placeholder="2" />
      <NumberField name="commuteDays" label="출근 일수" unit="일" values={values} errors={errors} set={set} placeholder="22" />
      <div className={styles.transitSum} aria-live="polite">
        <span className={styles.transitLabel}>한 달 교통비 <strong>계산</strong></span>
        {monthly === null ? <span className={styles.help}>편도 요금을 넣으면 계산해요</span> : <span className={styles.transitValue}>{monthly.toLocaleString("ko-KR")}원</span>}
      </div>
    </div>
  );
}

function sectionStatus(section: Section, v: InterestHomeInput) {
  if (section === "basic") return foldStatus({ all: [v.name, v.sidoCode, v.sigunguCode, v.exclusiveArea, v.housingType], required: [v.name, v.sidoCode, v.sigunguCode, v.housingType] });
  if (section === "contract") return foldStatus({ all: [v.deposit, v.monthlyRent], required: [v.monthlyRent] });
  return foldStatus({ all: SECTION_FIELDS[section].map((k) => v[k as keyof InterestHomeInput]), required: [] });
}

function DrawerForm({ target, initial, onDone }: { target: DrawerTarget; initial: InterestHomeInput; onDone: () => void }) {
  const [state, action, pending] = useActionState<InterestHomeState, FormData>(saveInterestHome, {});
  const [values, setValues] = useState(initial);
  const set: SetValue = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));
  const errors: Errors = state.errors ?? {};
  useEffect(() => {
    if (state.saved) onDone();
  }, [state, onDone]);
  const isOpen = (section: Section) =>
    target.mode === "new" || (target.focus ? section === target.focus : false) || SECTION_FIELDS[section].some((k) => Boolean(errors[k]));
  return (
    <form action={action} noValidate className={styles.drawerForm}>
      {target.mode === "edit" ? <input type="hidden" name="id" value={target.id} /> : null}
      <h2 id="drawer-title" className={styles.drawerTitle}>{target.mode === "new" ? "관심 주택 등록" : "관심 주택 고치기"}</h2>
      <p className={styles.requiredNote}><span aria-hidden="true" className={styles.required}>*</span> 필수 입력</p>
      {state.error ? <p className={styles.formAlert} role="alert">{state.error}</p> : null}
      <div className={styles.folds}>
        <FoldSection title="기본 정보" status={sectionStatus("basic", values)} open={isOpen("basic")}><BasicFields values={values} errors={errors} set={set} /></FoldSection>
        <FoldSection title="계약 정보" status={sectionStatus("contract", values)} open={isOpen("contract")}>
          <div className={styles.grid2}>
            <NumberField name="deposit" label="보증금" unit="원" optional values={values} errors={errors} set={set} placeholder="예: 10000000" />
            <NumberField name="monthlyRent" label="월세" unit="원" required values={values} errors={errors} set={set} placeholder="전세면 0" />
          </div>
        </FoldSection>
        <FoldSection title="관리비" optional status={sectionStatus("fee", values)} open={isOpen("fee")}>
          <div className={styles.grid2}>
            <NumberField name="maintenanceFee" label="월 관리비" unit="원" optional values={values} errors={errors} set={set} placeholder="예: 60000" />
            <NumberField name="electricityKwh" label="월 전기 사용량" unit="kWh" optional values={values} errors={errors} set={set} placeholder="예: 220" />
            <NumberField name="energyCost" label="월 에너지비" unit="원" optional values={values} errors={errors} set={set} placeholder="고지서 합계" />
            <p className={`${styles.full} ${styles.help}`}>모르면 비워 두세요. 시군구 평균으로 추정해서 &lsquo;추정값&rsquo;으로 보여 드려요. 에너지비를 넣으면 전기 사용량보다 먼저 써요.</p>
          </div>
        </FoldSection>
        <FoldSection title="교통비" optional status={sectionStatus("transit", values)} open={isOpen("transit")}><TransitFields values={values} errors={errors} set={set} /></FoldSection>
      </div>
      <div className={styles.drawerActions}>
        <button type="button" className={styles.buttonAssistive} onClick={onDone}>취소</button>
        <button type="submit" className={styles.buttonPrimary} disabled={pending}>{pending ? "저장하는 중…" : "저장"}</button>
      </div>
    </form>
  );
}

const EMPTY: InterestHomeInput = {
  name: "", sidoCode: "", sigunguCode: "", housingType: "", exclusiveArea: "", areaUnit: "m2", deposit: "", monthlyRent: "", maintenanceFee: "",
  energyCost: "", electricityKwh: "", transitFare: "", tripsPerDay: "", commuteDays: "",
};

/** 네이티브 dialog: Esc로 닫히고, 열린 동안 뒤 화면으로 초점이 나가지 않으며, 닫으면 초점이 연 버튼으로 돌아간다 */
export function CompareDrawer({ dialogRef, target, onClose }: { dialogRef: RefObject<HTMLDialogElement | null>; target: DrawerTarget | null; onClose: () => void }) {
  const done = () => dialogRef.current?.close();
  return (
    <dialog ref={dialogRef} className={styles.drawer} aria-labelledby="drawer-title" onClose={onClose}>
      {target ? <DrawerForm key={JSON.stringify(target)} target={target} initial={target.mode === "edit" ? target.input : EMPTY} onDone={done} /> : null}
    </dialog>
  );
}
