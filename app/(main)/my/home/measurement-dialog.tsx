"use client";

import { useActionState, useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { toKstDateTime } from "@/watch/kst";
import { addMeasurement, type MeasurementState } from "./actions";
import formStyles from "@/app/_components/form.module.css";
import styles from "../../incidents/[id]/detail.module.css";

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className={formStyles.fieldError}>{message}</p> : null;
}

const noop = () => () => {};

// IA MY_030201_MD 실내 온습도 입력 (FR-002, spec 003). 저장하면 창을 닫고 목록이 새로 그려진다
// 사용자 요청(2026-11-23): 이 칸을 내 집 폼의 저장 버튼 위로 옮겼다. 측정값은 따로 저장하므로 창(폼)은 body로 빼서
// 내 집 폼 안에 폼이 겹치지 않게 한다
export function MeasurementDialog() {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<MeasurementState, FormData>(addMeasurement, {});
  const errors = state.errors ?? {};
  const values = state.values;

  useEffect(() => {
    if (state.saved) dialog.current?.close();
  }, [state]);

  return (
    <>
      {/* 내 집 저장 버튼과 헷갈리지 않게 보조 버튼, 칸 너비로 늘리지 않는다 */}
      <div>
        <button type="button" className={formStyles.assistive} onClick={() => dialog.current?.showModal()}>측정값 추가</button>
        <p className={formStyles.help}>측정값은 이 창에서 따로 저장돼요. 아래 저장 버튼과는 상관없어요.</p>
      </div>
      {state.saved ? <p className={formStyles.notice} role="status">측정값을 저장했습니다.</p> : null}
      {mounted ? createPortal(<dialog ref={dialog} className={styles.dialog} aria-labelledby="measurement-title">
        <h2 id="measurement-title">실내 온습도 입력</h2>
        <p>습도계로 잰 값을 넣어 주세요. 이 값과 날씨 예보로 결로 위험을 계산합니다.</p>
        {/* 값이 바뀔 때 폼을 새로 그려 되살린 입력을 보여 준다 */}
        <form key={JSON.stringify(values ?? {})} action={action} className={formStyles.form} noValidate>
          {state.error ? <p className={formStyles.alert} role="alert">{state.error}</p> : null}
          <div className={formStyles.field}>
            <label className={formStyles.label} htmlFor="temperature">실내 온도 (°C)</label>
            <input id="temperature" name="temperature" inputMode="decimal" placeholder="예: 22" defaultValue={values?.temperature}
              className={formStyles.input} aria-invalid={Boolean(errors.temperature)} aria-describedby="temperature-error" />
            <FieldError id="temperature-error" message={errors.temperature} />
          </div>
          <div className={formStyles.field}>
            <label className={formStyles.label} htmlFor="humidity">실내 습도 (%)</label>
            <input id="humidity" name="humidity" inputMode="decimal" placeholder="예: 65" defaultValue={values?.humidity}
              className={formStyles.input} aria-invalid={Boolean(errors.humidity)} aria-describedby="humidity-error" />
            <FieldError id="humidity-error" message={errors.humidity} />
          </div>
          <div className={formStyles.field}>
            <label className={formStyles.label} htmlFor="measuredAt">측정 시각</label>
            <input id="measuredAt" name="measuredAt" type="datetime-local" defaultValue={values?.measuredAt ?? toKstDateTime(new Date())}
              className={formStyles.input} aria-invalid={Boolean(errors.measuredAt)} aria-describedby="measuredAt-error" />
            <FieldError id="measuredAt-error" message={errors.measuredAt} />
          </div>
          <div className={styles.dialogButtons}>
            <button type="submit" className={formStyles.primary} disabled={pending}>{pending ? "저장 중…" : "저장"}</button>
            <button type="button" className={styles.cancel} onClick={() => dialog.current?.close()}>취소</button>
          </div>
        </form>
      </dialog>, document.body) : null}
    </>
  );
}
