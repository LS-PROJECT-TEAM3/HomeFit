"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { withObject } from "@/incident/korean";
import { approveIncident, rejectIncident, type DecisionState } from "./actions";
import styles from "./alert.module.css";

// spec 008 FR-006: 시세 알림은 재계약 판단 메모(내 집)·관심 지역 다시 보기(관심 지역)
export type PlanName = "신청 준비 계획" | "대응 계획" | "재계약 판단 메모" | "관심 지역 다시 보기";

// spec 022(캔버스 v2-s6-reject-pc): 거절 이유는 고르기 + 기타면 직접 적기. 사유는 그대로 필수(FR-012)
const REASONS = ["이미 지원했어요", "자격이 안 돼요", "일정이 맞지 않아요", "관심이 없어요", "기타"];

// IA IC_020101_MD 대응안 승인, IC_020102_MD 대응안 거절 (FR-011, FR-012, spec 001). spec 022: 아래에 붙는 거절·승인 줄(보드 Action Bar)
// spec 003 FR-012 수용 기준 2: 승인 창은 알림 종류에 맞는 계획 이름을 말한다
export function DecisionPanel({ incidentId, planName }: { incidentId: string; planName: PlanName }) {
  const router = useRouter();
  const approveDialog = useRef<HTMLDialogElement>(null);
  const rejectDialog = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<DecisionState>({});
  const [which, setWhich] = useState<"approve" | "reject">("approve");
  const [choice, setChoice] = useState(REASONS[0]);
  const [other, setOther] = useState("");
  const [pending, startTransition] = useTransition();

  const run = (kind: "approve" | "reject", action: () => Promise<DecisionState>, dialog: HTMLDialogElement | null) =>
    startTransition(async () => {
      setWhich(kind);
      const result = await action();
      setState(result);
      if (result.done) {
        dialog?.close();
        router.refresh(); // 화면 위쪽에 처리 결과(승인함·거절함)를 보인다
      }
    });
  const reason = choice === "기타" ? other : choice;

  if (state.done) return null;
  return (
    <>
      <div className={styles.actionBar}>
        <button type="button" className={styles.rejectButton} onClick={() => rejectDialog.current?.showModal()}>거절</button>
        <button type="button" className={styles.approveButton} onClick={() => approveDialog.current?.showModal()}>승인</button>
      </div>

      <dialog ref={approveDialog} className={styles.dialog} aria-labelledby="approve-title">
        <h2 id="approve-title" className={styles.dialogTitle}>{withObject(planName)} 승인할까요?</h2>
        <p className={styles.help}>승인하면 체크리스트와 마감일이 내 일정에 들어가요.</p>
        {state.error && which === "approve" ? <p className={styles.error} role="alert">{state.error}</p> : null}
        <div className={styles.dialogActions}>
          <button type="button" className={styles.cancelButton} onClick={() => approveDialog.current?.close()}>취소</button>
          <button type="button" className={styles.approveButton} disabled={pending} onClick={() => run("approve", () => approveIncident(incidentId), approveDialog.current)}>{pending ? "처리 중…" : "승인"}</button>
        </div>
      </dialog>

      <dialog ref={rejectDialog} className={styles.dialog} aria-labelledby="reject-title">
        <h2 id="reject-title" className={styles.dialogTitle}>거절하는 이유가 뭐예요?</h2>
        <fieldset className={styles.reasons}>
          <legend className={styles.srOnly}>거절 이유</legend>
          {REASONS.map((r) => (
            <label key={r} className={`${styles.reason} ${choice === r ? styles.reasonOn : ""}`}>
              <input type="radio" name="reject-reason" value={r} checked={choice === r} onChange={() => setChoice(r)} />{r}
            </label>
          ))}
        </fieldset>
        {choice === "기타" ? (
          <div className={styles.field}>
            <label htmlFor="reject-other" className={styles.label}>이유 (필수)</label>
            <input id="reject-other" className={styles.input} value={other} onChange={(e) => setOther(e.target.value)} placeholder="예: 다른 공고를 보고 있어요" aria-describedby="reject-error" />
          </div>
        ) : null}
        {state.error && which === "reject" ? <p id="reject-error" className={styles.error} role="alert">{state.error}</p> : null}
        <div className={styles.dialogActions}>
          <button type="button" className={styles.cancelButton} onClick={() => rejectDialog.current?.close()}>취소</button>
          <button type="button" className={styles.rejectConfirm} disabled={pending} onClick={() => run("reject", () => rejectIncident(incidentId, reason), rejectDialog.current)}>{pending ? "처리 중…" : "거절"}</button>
        </div>
      </dialog>
    </>
  );
}
