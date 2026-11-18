"use client";

import { useActionState, useRef } from "react";
import { EDITABLE_FIELDS, type EditTable, type EditValue } from "@/incident/admin-edit";
import { saveMemberEdit, type EditState } from "./edit-actions";
import formStyles from "@/app/_components/form.module.css";
import dialogStyles from "@/app/(main)/incidents/[id]/detail.module.css";

type Props = { table: EditTable; targetId: string; memberId: string; title: string; values: Record<string, EditValue> };

// IA AD_070102_MD 관리자 수정 (spec 010 FR-003). 사유 필수, 저장하면 수정 기록이 한 줄 생긴다
export function EditDialog({ table, targetId, memberId, title, values }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<EditState, FormData>(saveMemberEdit, {});
  const errors = state.errors ?? {};
  const id = (name: string) => `${table}-${name}`;
  const shown = (name: string) => state.values?.[name] ?? (values[name] === null || values[name] === undefined ? "" : String(values[name]));
  return (
    <>
      <button type="button" className={dialogStyles.cancel} onClick={() => dialog.current?.showModal()}>{title} 고치기</button>
      <dialog ref={dialog} className={dialogStyles.dialog} aria-labelledby={id("title")}>
        <h2 id={id("title")}>{title} 고치기</h2>
        {state.saved ? <p className={formStyles.notice} role="status">고쳤습니다. 회원 상세의 수정 기록에 남았습니다.</p> : null}
        <form key={`${state.savedAt ?? ""}|${JSON.stringify(state.values ?? null)}`} action={action} className={formStyles.form} noValidate>
          <input type="hidden" name="table" value={table} />
          <input type="hidden" name="targetId" value={targetId} />
          <input type="hidden" name="memberId" value={memberId} />
          {state.error ? <p className={formStyles.alert} role="alert">{state.error}</p> : null}
          {errors.form ? <p className={formStyles.alert} role="alert">{errors.form}</p> : null}
          {Object.entries(EDITABLE_FIELDS[table]).map(([name, field]) => (
            <div key={name} className={formStyles.field}>
              <label className={formStyles.label} htmlFor={id(name)}>{field.label}</label>
              <input id={id(name)} name={name} className={formStyles.input} defaultValue={shown(name)}
                inputMode={field.kind === "date" ? undefined : "decimal"} type={field.kind === "date" ? "date" : "text"}
                aria-invalid={Boolean(errors[name])} aria-describedby={`${id(name)}-error`} />
              {errors[name] ? <p id={`${id(name)}-error`} className={formStyles.fieldError}>{errors[name]}</p> : null}
            </div>
          ))}
          <div className={formStyles.field}>
            <label className={formStyles.label} htmlFor={id("reason")}>수정 사유 (필수, 2~200자)</label>
            <input id={id("reason")} name="reason" className={formStyles.input} placeholder="예: 회원 요청으로 월세 정정" defaultValue={shown("reason")}
              aria-invalid={Boolean(errors.reason)} aria-describedby={`${id("reason")}-error`} />
            {errors.reason ? <p id={`${id("reason")}-error`} className={formStyles.fieldError}>{errors.reason}</p> : null}
          </div>
          <p className={formStyles.help}>담당자·시각·고치기 전후 값·사유가 수정 기록에 남고 지울 수 없습니다. 회원에게 알림은 가지 않습니다.</p>
          <div className={dialogStyles.dialogButtons}>
            <button type="submit" className={formStyles.primary} disabled={pending}>{pending ? "저장 중…" : "저장"}</button>
            <button type="button" className={dialogStyles.cancel} onClick={() => dialog.current?.close()}>닫기</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
