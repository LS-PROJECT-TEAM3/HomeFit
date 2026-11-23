"use client";

import { useActionState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { FieldLabel, UnitBox } from "@/app/_components/form-ui";
import { toKstDateTime } from "@/watch/kst";
import { addMeasurement, type MeasurementState } from "./actions";
import formStyles from "@/app/_components/form.module.css";

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className={formStyles.fieldError}>{message}</p> : null;
}

const noop = () => () => {};
const FORM_ID = "measurement-form";

// IA MY_030201_MD 실내 온습도 입력 (FR-002, spec 003). 저장하면 목록이 새로 그려진다
// 사용자 요청(2026-11-23): 창(측정값 추가 버튼) 대신 다른 묶음처럼 칸을 바로 보인다.
// 이 칸들은 내 집 폼 안에 있지만 측정값은 따로 저장하므로, 빈 폼을 body에 두고 칸·버튼을 form 속성으로 그 폼에 잇는다(폼 안에 폼을 겹치지 않음)
export function MeasurementFields() {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const [state, action, pending] = useActionState<MeasurementState, FormData>(addMeasurement, {});
  const errors = state.errors ?? {};
  const values = state.values;
  return (
    <>
      {mounted ? createPortal(<form id={FORM_ID} action={action} noValidate hidden />, document.body) : null}
      {state.error ? <p className={formStyles.alert} role="alert">{state.error}</p> : null}
      {state.saved ? <p className={formStyles.notice} role="status">측정값을 저장했습니다.</p> : null}
      {/* 값이 바뀔 때 칸을 새로 그려 되살린 입력(또는 저장 뒤 빈 칸)을 보여 준다 */}
      <div key={JSON.stringify(values ?? state)} className={formStyles.triple}>
        <div className={formStyles.field}>
          <FieldLabel htmlFor="temperature" label="실내 온도" required />
          <UnitBox unit="°C">
            <input id="temperature" name="temperature" form={FORM_ID} inputMode="decimal" placeholder="예: 22" defaultValue={values?.temperature}
              className={formStyles.input} aria-invalid={Boolean(errors.temperature)} aria-describedby="temperature-error" />
          </UnitBox>
          <FieldError id="temperature-error" message={errors.temperature} />
        </div>
        <div className={formStyles.field}>
          <FieldLabel htmlFor="humidity" label="실내 습도" required />
          <UnitBox unit="%">
            <input id="humidity" name="humidity" form={FORM_ID} inputMode="decimal" placeholder="예: 65" defaultValue={values?.humidity}
              className={formStyles.input} aria-invalid={Boolean(errors.humidity)} aria-describedby="humidity-error" />
          </UnitBox>
          <FieldError id="humidity-error" message={errors.humidity} />
        </div>
        <div className={formStyles.field}>
          <FieldLabel htmlFor="measuredAt" label="측정 시각" required />
          <input id="measuredAt" name="measuredAt" form={FORM_ID} type="datetime-local" defaultValue={values?.measuredAt ?? toKstDateTime(new Date())}
            className={formStyles.input} aria-invalid={Boolean(errors.measuredAt)} aria-describedby="measuredAt-error" suppressHydrationWarning />
          <FieldError id="measuredAt-error" message={errors.measuredAt} />
        </div>
      </div>
      {/* 내 집 저장 버튼과 헷갈리지 않게 보조 버튼, 칸 너비로 늘리지 않는다 */}
      <div>
        <button type="submit" form={FORM_ID} className={formStyles.assistive} disabled={pending}>{pending ? "저장 중…" : "측정값 저장"}</button>
        <p className={formStyles.help}>온습도는 이 버튼으로 따로 저장돼요. 아래 저장 버튼과는 상관없어요.</p>
      </div>
    </>
  );
}
