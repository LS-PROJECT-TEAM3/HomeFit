"use client";

import { useActionState, useEffect, useTransition } from "react";
import { DEFECT_KINDS } from "@/incident/defect-form";
import { addDefectRecord, deleteDefectRecord } from "./actions";
import styles from "../qc.module.css";

// spec 019 FR-002: 하자 넣기. 사진은 1장, 선택(jpg·png·webp, 4MB 안). spec 022: "+ 기록 추가" 옆 창 안에서 쓴다
export function DefectForm({ today, onSaved, onCancel }: { today: string; onSaved: () => void; onCancel: () => void }) {
  const [state, formAction, pending] = useActionState(addDefectRecord, {});
  const v = state.values;
  const err = state.errors ?? {};
  useEffect(() => {
    if (state.savedAt) onSaved();
  }, [state.savedAt, onSaved]);
  return (
    <form key={state.savedAt ?? "new"} action={formAction} className={styles.drawerForm} aria-labelledby="defect-drawer-title">
      <h2 id="defect-drawer-title" className={styles.drawerTitle}>하자 기록 추가</h2>
      <div className={styles.inputs}>
        <div className={styles.field}>
          <label htmlFor="defect-date" className={styles.fieldLabel}>생긴 날</label>
          <input id="defect-date" name="occurredOn" type="date" max={today} defaultValue={v?.occurredOn ?? today} className={styles.input} aria-invalid={Boolean(err.occurredOn)} aria-describedby={err.occurredOn ? "defect-date-error" : undefined} />
          {err.occurredOn ? <span id="defect-date-error" className={styles.fieldError} role="alert">{err.occurredOn}</span> : null}
        </div>
        <div className={styles.field}>
          <label htmlFor="defect-kind" className={styles.fieldLabel}>종류</label>
          <select id="defect-kind" name="kind" defaultValue={v?.kind ?? "leak"} className={styles.input} aria-invalid={Boolean(err.kind)}>
            {Object.entries(DEFECT_KINDS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          {err.kind ? <span className={styles.fieldError} role="alert">{err.kind}</span> : null}
        </div>
        <div className={`${styles.field} ${styles.full}`}>
          <label htmlFor="defect-memo" className={styles.fieldLabel}>무엇이 어떻게 (500자 안)</label>
          <textarea id="defect-memo" name="memo" rows={3} maxLength={500} defaultValue={v?.memo ?? ""} className={`${styles.input} ${styles.textarea}`} placeholder="예: 욕실 천장 모서리에서 물이 떨어짐, 관리실에 알림" aria-invalid={Boolean(err.memo)} />
          {err.memo ? <span className={styles.fieldError} role="alert">{err.memo}</span> : null}
        </div>
        <div className={`${styles.field} ${styles.full}`}>
          <label htmlFor="defect-photo" className={styles.fieldLabel}>사진 1장 (선택, jpg·png·webp, 4MB 안)</label>
          <input id="defect-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" className={styles.fileInput} />
          {err.photo ? <span className={styles.fieldError} role="alert">{err.photo}</span> : null}
        </div>
      </div>
      <p className={styles.help}>사진은 본인만 볼 수 있어요. 원인이나 책임은 판정하지 않아요.</p>
      {state.error ? <p role="alert" className={styles.formAlert}>{state.error}</p> : null}
      <div className={styles.drawerActions}>
        <button type="button" className={styles.buttonAssistive} onClick={onCancel}>취소</button>
        <button type="submit" className={styles.buttonPrimary} disabled={pending}>{pending ? "저장하는 중…" : "저장"}</button>
      </div>
    </form>
  );
}

// spec 019 FR-003: 지우기(사진도 함께). 되돌릴 수 없어 한 번 더 묻는다
export function DeleteDefectButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const remove = () => {
    if (!window.confirm("이 하자 기록과 사진을 지울까요? 되돌릴 수 없어요.")) return;
    start(async () => {
      const result = await deleteDefectRecord(id);
      if (result.error) window.alert(result.error);
    });
  };
  return <button type="button" className={styles.textButton} onClick={remove} disabled={pending}>{pending ? "지우는 중…" : "삭제"}</button>;
}
