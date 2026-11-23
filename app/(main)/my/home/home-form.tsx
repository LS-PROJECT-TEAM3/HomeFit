"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { HOUSING_LABELS, WINDOW_LABELS, type HomeFormInput } from "@/incident/home-form";
import { SIDO_OPTIONS } from "@/watch/sido";
import { costInput } from "@/app/_components/cost-fields";
import { filledStatus, Fold, FoldMemoryProvider } from "@/app/_components/fold";
import { FieldLabel, OptionGroup, UnitBox } from "@/app/_components/form-ui";
import { SavedNotice } from "@/app/_components/saved-notice";
import { useFirstError } from "@/app/_components/use-first-error";
import { SigunguField } from "../conditions/sigungu-field";
import { saveHome, type HomeState } from "./actions";
import { GasFold } from "./gas-fold";
import type { MyHome } from "./load";
import styles from "@/app/_components/form.module.css";

// IA MY_030200_TB 내 집 (FR-001, spec 003) → spec 022(캔버스 v2-set-home-pc·v2-s1-open-pc): 기본 정보 / 계약 정보 / 관리비 / 교통비 묶음.
// 화면 라벨은 "/"로 잇는다(사용자 요청 2026-11-21). 저장 값과 검사(incident/home-form.ts)는 그대로

function toInput(home: MyHome | null): HomeFormInput {
  return {
    sidoCode: home?.sigunguCode.slice(0, 2) ?? "", sigunguCode: home?.sigunguCode ?? "", housingType: home?.housingType ?? "",
    exclusiveArea: home ? String(home.exclusiveAreaM2) : "", areaUnit: "m2", windowType: home?.windowType ?? "unknown",
    contractType: home?.contractType ?? "", deposit: home?.deposit?.toString() ?? "", monthlyRent: home?.monthlyRent?.toString() ?? "",
    maintenanceFee: home?.maintenanceFee?.toString() ?? "", contractEndDate: home?.contractEndDate ?? "",
  };
}

const slash = (label: string) => label.replaceAll("·", "/");

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className={styles.fieldError}>{message}</p> : null;
}

type Errors = NonNullable<HomeState["errors"]>;

// 사용자 요청(2026-11-23): 설정에서는 묶음을 접어 두고 첫 설정에서는 펼친다. 오류가 있는 묶음은 늘 펼쳐 오류를 가리지 않는다
type FoldOpen = { expand: boolean };
const anyError = (errors: Errors, keys: readonly string[]) => keys.some((key) => Boolean((errors as Record<string, string | undefined>)[key]));

/** 숫자 칸 하나(칸 안 단위) */
function NumberField({ name, label, unit, value, error, placeholder, help, required }: { name: string; label: string; unit: string; value: string; error?: string; placeholder?: string; help?: string; required?: boolean }) {
  return (
    <div className={styles.field}>
      <FieldLabel htmlFor={name} label={label} required={required} />
      <UnitBox unit={unit}>
        <input id={name} name={name} inputMode="numeric" placeholder={placeholder} defaultValue={value} className={styles.input}
          aria-invalid={Boolean(error)} aria-describedby={`${name}-help ${name}-error`} />
      </UnitBox>
      {help ? <p id={`${name}-help`} className={styles.help}>{help}</p> : null}
      <FieldError id={`${name}-error`} message={error} />
    </div>
  );
}

// 사용자 요청(2026-11-17): 전용면적을 평으로도 넣는다. 저장은 ㎡. 칸 안 단위 자리에서 ㎡/평을 고른다
function AreaField({ value, unit, error }: { value: string; unit: string; error?: string }) {
  const [picked, setPicked] = useState(unit === "pyeong" ? "pyeong" : "m2");
  return (
    <div className={styles.field}>
      <FieldLabel htmlFor="exclusiveArea" label="전용면적" required />
      <UnitBox unit={(
        <select name="areaUnit" aria-label="면적 단위(평으로 넣으면 ㎡로 바꿔 저장)" title="평으로 넣으면 ㎡로 바꿔 저장해요(1평 ≈ 3.31㎡)" value={picked} onChange={(e) => setPicked(e.target.value)}>
          <option value="m2">㎡</option>
          <option value="pyeong">평</option>
        </select>
      )}>
        <input id="exclusiveArea" name="exclusiveArea" inputMode="decimal" placeholder={picked === "pyeong" ? "예: 6" : "예: 20"}
          defaultValue={value} className={styles.input} aria-invalid={Boolean(error)} aria-describedby="exclusiveArea-error" />
      </UnitBox>
      <FieldError id="exclusiveArea-error" message={error} />
    </div>
  );
}

// spec 025 2단계 리뷰: 고른 시도를 HomeFields가 들고 있어 도시가스 묶음의 요금 지역 칸이 바로 따라간다
function BasicFold({ values, errors, expand, sidoCode, setSidoCode }: { values: HomeFormInput; errors: Errors; sidoCode: string; setSidoCode: (code: string) => void } & FoldOpen) {
  return (
    <Fold title="기본 정보" status={filledStatus([values.sigunguCode, values.housingType, values.exclusiveArea, values.windowType])} open={expand || anyError(errors, ["sidoCode", "sigunguCode", "housingType", "exclusiveArea", "windowType"])}>
      <div className={styles.field}>
        <FieldLabel htmlFor="sidoCode" label="시도" required />
        <select id="sidoCode" name="sidoCode" value={sidoCode} onChange={(e) => setSidoCode(e.target.value)} className={styles.input}>
          <option value="">선택해 주세요</option>
          {SIDO_OPTIONS.map((sido) => <option key={sido.code} value={sido.code}>{sido.name}</option>)}
        </select>
      </div>
      {/* 상세 주소는 받지 않는다. 시군구로 날씨 예보를 읽는다 (ERD homes.sigungu_code) */}
      <SigunguField sidoCode={sidoCode} initial={values.sigunguCode} error={errors.sigunguCode}
        label={<>시군구<span className={styles.req} aria-hidden="true">*</span><span className={styles.srOnly}>필수</span></>} emptyLabel="선택해 주세요" />
      <div className={styles.full}>
        <OptionGroup name="housingType" label="주택 유형" required fill value={values.housingType} error={errors.housingType}
          options={Object.entries(HOUSING_LABELS).map(([value, label]) => ({ value, label: slash(label) }))} />
      </div>
      <AreaField value={values.exclusiveArea} unit={values.areaUnit} error={errors.exclusiveArea} />
      <div className={styles.field}>
        <FieldLabel htmlFor="windowType" label="창 종류" />
        <select id="windowType" name="windowType" defaultValue={values.windowType || "unknown"} className={styles.input} aria-describedby="windowType-help windowType-error">
          {Object.entries(WINDOW_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <p id="windowType-help" className={styles.help}>결로 위험을 계산할 때 써요. 모르면 &lsquo;모름&rsquo;으로 두세요.</p>
        <FieldError id="windowType-error" message={errors.windowType} />
      </div>
    </Fold>
  );
}

// spec 003 v0.2 FR-001 수용 기준 6·7: 계약 칸(모두 선택). 홈 "월 실질 주거비"와 계약 만료 알림(spec 013)에 쓴다
function ContractFold({ values, errors, expand }: { values: HomeFormInput; errors: Errors } & FoldOpen) {
  return (
    <Fold title="계약 정보" tip="만료 2달 전부터 내 일정에서 알려 드려요." status={filledStatus([values.contractType, values.contractEndDate, values.deposit, values.monthlyRent])} open={expand || anyError(errors, ["contractType", "contractEndDate", "deposit", "monthlyRent"])}>
      <OptionGroup name="contractType" label="계약 형태" fill value={values.contractType} error={errors.contractType}
        options={[{ value: "monthly", label: "월세" }, { value: "jeonse", label: "전세" }]} />
      <div className={styles.field}>
        <FieldLabel htmlFor="contractEndDate" label="만료일" />
        <input id="contractEndDate" name="contractEndDate" type="date" defaultValue={values.contractEndDate} className={styles.input}
          aria-invalid={Boolean(errors.contractEndDate)} aria-describedby="contractEndDate-error" />
        <FieldError id="contractEndDate-error" message={errors.contractEndDate} />
      </div>
      <NumberField name="deposit" label="보증금" unit="원" value={values.deposit} error={errors.deposit} placeholder="예: 10,000,000" />
      <NumberField name="monthlyRent" label="월세" unit="원" value={values.monthlyRent} error={errors.monthlyRent} placeholder="전세면 비워 두세요" />
    </Fold>
  );
}

type Costs = NonNullable<HomeState["costs"]>;

// spec 009 FR-001·002: 관리비·에너지비. 에너지비를 넣으면 전기 사용량보다 먼저 쓴다
function ManagementFold({ values, costs, errors, expand }: { values: HomeFormInput; costs: Costs; errors: Errors } & FoldOpen) {
  return (
    <Fold title="관리비" mark="optional" tip="모르면 비워 두세요. 시군구 평균으로 추정해서 '추정값'으로 보여 드려요. 에너지비를 넣으면 전기 사용량보다 먼저 써요." status={filledStatus([values.maintenanceFee, costs.electricityKwh, costs.energyCost])} open={expand || anyError(errors, ["maintenanceFee", "electricityKwh", "energyCost"])}>
      <div className={styles.triple}>
        <NumberField name="maintenanceFee" label="월 관리비" unit="원" value={values.maintenanceFee} error={errors.maintenanceFee} placeholder="예: 80,000" help="월세 외에 매달 내는 금액" />
        <NumberField name="electricityKwh" label="월 전기 사용량" unit="kWh" value={costs.electricityKwh} error={errors.electricityKwh} placeholder="예: 285" />
        <NumberField name="energyCost" label="월 에너지비" unit="원" value={costs.energyCost} error={errors.energyCost} placeholder="예: 50,000" />
      </div>
    </Fold>
  );
}

// spec 009 FR-002: 교통비 = 편도 × 하루 횟수 × 출근 일수. 넣는 대로 한 달 교통비를 보여 준다
function TransitFold({ costs, errors, expand }: { costs: Costs; errors: Errors } & FoldOpen) {
  const [fare, setFare] = useState(costs.transitFare);
  const [trips, setTrips] = useState(costs.tripsPerDay);
  const [days, setDays] = useState(costs.commuteDays);
  const num = (v: string) => Number(v.replace(/[,\s]/g, ""));
  const total = [fare, trips, days].every((v) => v.trim() !== "" && Number.isFinite(num(v))) ? num(fare) * num(trips) * num(days) : null;
  const input = (name: "transitFare" | "tripsPerDay" | "commuteDays", label: string, unit: string, value: string, set: (v: string) => void, placeholder: string) => (
    <div className={styles.field}>
      <FieldLabel htmlFor={name} label={label} />
      <UnitBox unit={unit}>
        <input id={name} name={name} inputMode="numeric" placeholder={placeholder} value={value} onChange={(e) => set(e.target.value)} className={styles.input}
          aria-invalid={Boolean(errors[name])} aria-describedby={`${name}-error`} />
      </UnitBox>
      <FieldError id={`${name}-error`} message={errors[name]} />
    </div>
  );
  return (
    <Fold title="교통비" mark="optional" status={filledStatus([fare, trips, days])} open={expand || anyError(errors, ["transitFare", "tripsPerDay", "commuteDays"])}>
      <div className={styles.triple}>
        {input("transitFare", "편도 요금", "원", fare, setFare, "예: 1,600")}
        {input("tripsPerDay", "하루 횟수", "번", trips, setTrips, "2")}
        {input("commuteDays", "출근 일수", "일", days, setDays, "22")}
      </div>
      <p className={styles.computed} aria-live="polite">한 달 교통비<b>{total === null ? "입력하면 계산해요" : `${total.toLocaleString("ko-KR")}원`}</b></p>
    </Fold>
  );
}

/** settings: 설정 탭(취소/저장). onboarding: 첫 설정 1단계(아래에 붙는 "1 / 2 단계 · 다음" 줄, 저장되면 2단계로) */
export type HomeFormMode = "settings" | "onboarding";

type Gas = NonNullable<HomeState["gas"]>;
type FieldsProps = { values: HomeFormInput; costs: Costs; gas: Gas; state: HomeState; action: (formData: FormData) => void; pending: boolean; mode: HomeFormMode; extra?: ReactNode };

function HomeFields({ values, costs, gas, state, action, pending, mode, extra }: FieldsProps) {
  const errors = state.errors ?? {};
  const expand = mode === "onboarding";
  const [sidoCode, setSidoCode] = useState(values.sidoCode);
  const formRef = useRef<HTMLFormElement>(null);
  useFirstError(formRef, state.errors);
  return (
    <form ref={formRef} action={action} className={styles.form} noValidate>
      {state.error ? <p className={styles.alert} role="alert">{state.error}</p> : null}
      {state.saved && mode === "settings" ? <SavedNotice /> : null}
      {/* 사용자 요청(2026-11-23): "* 필수 입력"은 아래 버튼 줄 대신 맨 위에 */}
      <p className={styles.actionsNote}><span className={styles.req} aria-hidden="true">*</span> 필수 입력</p>
      <BasicFold values={values} errors={errors} expand={expand} sidoCode={sidoCode} setSidoCode={setSidoCode} />
      <ContractFold values={values} errors={errors} expand={expand} />
      <ManagementFold values={values} costs={costs} errors={errors} expand={expand} />
      <TransitFold costs={costs} errors={errors} expand={expand} />
      {mode === "settings" ? <GasFold sidoCode={sidoCode} values={gas} errors={errors} /> : null}
      {extra}
      {mode === "settings" ? (
        <div className={styles.actions}>
          <button type="reset" className={styles.assistive}>취소</button>
          <button type="submit" className={styles.primary} disabled={pending}>{pending ? "저장 중…" : "저장"}</button>
        </div>
      ) : (
        <div className={styles.stepBar}>
          <span className={styles.stepCount}>1 / 2 단계</span>
          <button type="submit" className={styles.primary} disabled={pending}>{pending ? "저장 중…" : "다음 →"}</button>
        </div>
      )}
    </form>
  );
}

/** extra: 저장 버튼 위에 더 붙일 칸(설정의 실내 온습도. 따로 저장된다) */
export function HomeForm({ initial, mode = "settings", extra }: { initial: MyHome | null; mode?: HomeFormMode; extra?: ReactNode }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<HomeState, FormData>(saveHome, {});
  const values = state.values ?? toInput(initial);
  const costs = state.costs ?? costInput(initial);
  const gas = state.gas ?? { usage: initial?.gasUsageMj?.toString() ?? "", month: initial?.gasBillMonth?.toString() ?? "", region: initial?.gasTariffRegion ?? "" };
  // 첫 설정: 저장되면 2단계(공고/정책 조건)로
  useEffect(() => {
    if (mode === "onboarding" && state.saved) router.push("/onboarding?step=2");
  }, [mode, state.saved, router]);
  return (
    <FoldMemoryProvider>
      <HomeFields key={JSON.stringify([values, costs, gas])} values={values} costs={costs} gas={gas} state={state} action={action} pending={pending} mode={mode} extra={extra} />
    </FoldMemoryProvider>
  );
}

/** 첫 설정 왼쪽 "나중에 입력하기" */
export function SkipHomeLink({ className }: { className: string }) {
  return <Link href="/onboarding?step=2&skipped=1" className={className}>나중에 입력하기 ›</Link>;
}
