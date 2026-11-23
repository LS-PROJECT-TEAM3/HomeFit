"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { cancelApproval, cancelRejection, type UndoState } from "./actions";
import styles from "./alert.module.css";
import undoStyles from "./undo.module.css";

// spec 023 FR-004·FR-008 (IA IC_020100_PG): 승인함·거절함 줄에 붙는 되돌리기.
// 승인 취소는 일정과 체크한 내용이 지워지니 확인 창을 거친다. 거절 취소는 지울 것이 없어 바로 한다
export function UndoApproval({ incidentId }: { incidentId: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { state, pending, run, reset } = useUndo();
  return (
    <>
      <button type="button" className={undoStyles.undoButton} onClick={() => { reset(); dialog.current?.showModal(); }}>승인 취소</button>
      <dialog ref={dialog} className={styles.dialog} aria-labelledby="undo-approve-title">
        <h2 id="undo-approve-title" className={styles.dialogTitle}>승인을 취소할까요?</h2>
        <p className={styles.help}>이 승인으로 만든 일정과 체크한 내용이 지워져요. 알림은 승인 대기로 돌아가고, 다시 승인할 수 있어요.</p>
        {state.error ? <p className={styles.error} role="alert">{state.error}</p> : null}
        <div className={styles.dialogActions}>
          <button type="button" className={styles.cancelButton} onClick={() => dialog.current?.close()}>닫기</button>
          <button type="button" className={styles.rejectConfirm} disabled={pending} onClick={() => run(() => cancelApproval(incidentId), dialog.current)}>{pending ? "처리 중…" : "승인 취소"}</button>
        </div>
      </dialog>
    </>
  );
}

export function UndoRejection({ incidentId }: { incidentId: string }) {
  const { state, pending, run } = useUndo();
  return (
    <span className={undoStyles.undoGroup}>
      <button type="button" className={undoStyles.undoButton} disabled={pending} onClick={() => run(() => cancelRejection(incidentId), null)}>{pending ? "처리 중…" : "거절 취소"}</button>
      {/* 완료 줄(role=status)이 바뀐 글을 읽어 주므로 따로 alert를 두지 않는다 */}
      {state.error ? <span className={styles.error}>{state.error}</span> : null}
    </span>
  );
}

function useUndo() {
  const router = useRouter();
  const [state, setState] = useState<UndoState>({});
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<UndoState>, dialog: HTMLDialogElement | null) =>
    startTransition(async () => {
      const result = await action();
      setState(result);
      if (result.done) {
        dialog?.close();
        router.refresh(); // 승인 대기로 돌아가 승인·거절 줄이 다시 보인다
      }
    });
  return { state, pending, run, reset: () => setState({}) };
}
