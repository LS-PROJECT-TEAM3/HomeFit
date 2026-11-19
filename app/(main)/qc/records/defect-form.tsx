"use client";

import { useActionState, useTransition } from "react";
import { DEFECT_KINDS } from "@/incident/defect-form";
import { addDefectRecord, deleteDefectRecord } from "./actions";
import styles from "@/app/_components/hub.module.css";

// spec 019 FR-002: 하자 넣기. 사진은 1장, 선택(jpg·png·webp, 4MB 안)
export function DefectForm({ today }: { today: string }) {
  const [state, formAction, pending] = useActionState(addDefectRecord, {});
  const v = state.values;
  const err = state.errors ?? {};
  return (
    <form key={state.savedAt ?? "new"} action={formAction} className={styles.form} aria-label="하자 기록 넣기">
      <div className={styles.field}>
        <label htmlFor="defect-date">생긴 날</label>
        <input id="defect-date" name="occurredOn" type="date" max={today} defaultValue={v?.occurredOn ?? today} className={styles.input} aria-invalid={Boolean(err.occurredOn)} aria-describedby={err.occurredOn ? "defect-date-error" : undefined} />
        {err.occurredOn ? <span id="defect-date-error" role="alert">{err.occurredOn}</span> : null}
      </div>
      <div className={styles.field}>
        <label htmlFor="defect-kind">종류</label>
        <select id="defect-kind" name="kind" defaultValue={v?.kind ?? "leak"} className={styles.input} aria-invalid={Boolean(err.kind)}>
          {Object.entries(DEFECT_KINDS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        {err.kind ? <span role="alert">{err.kind}</span> : null}
      </div>
      <div className={styles.field}>
        <label htmlFor="defect-memo">무엇이 어떻게 (500자 안)</label>
        <textarea id="defect-memo" name="memo" rows={3} maxLength={500} defaultValue={v?.memo ?? ""} className={styles.input} placeholder="예: 욕실 천장 모서리에서 물이 떨어짐, 관리실에 알림" aria-invalid={Boolean(err.memo)} />
        {err.memo ? <span role="alert">{err.memo}</span> : null}
      </div>
      <div className={styles.field}>
        <label htmlFor="defect-photo">사진 1장 (선택, jpg·png·webp, 4MB 안)</label>
        <input id="defect-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" className={styles.input} />
        {err.photo ? <span role="alert">{err.photo}</span> : null}
      </div>
      {state.error ? <p role="alert">{state.error}</p> : null}
      {state.savedAt ? <p role="status" className={styles.muted}>저장했습니다.</p> : null}
      <button type="submit" className={styles.primaryButton} disabled={pending}>{pending ? "저장하는 중…" : "하자 기록 저장"}</button>
    </form>
  );
}

// spec 019 FR-003: 지우기(사진도 함께). 되돌릴 수 없어 한 번 더 묻는다
export function DeleteDefectButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const remove = () => {
    if (!window.confirm("이 하자 기록과 사진을 지울까요? 되돌릴 수 없습니다.")) return;
    start(async () => {
      const result = await deleteDefectRecord(id);
      if (result.error) window.alert(result.error);
    });
  };
  return <button type="button" className={styles.tab} onClick={remove} disabled={pending}>{pending ? "지우는 중…" : "지우기"}</button>;
}
