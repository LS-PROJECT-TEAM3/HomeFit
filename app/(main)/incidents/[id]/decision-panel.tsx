"use client";

import { withObject } from "@/incident/korean";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { approveIncident, rejectIncident, type DecisionState } from "./actions";
import styles from "./detail.module.css";

// spec 008 FR-006: 시세 알림은 재계약 판단 메모(내 집)·관심 지역 다시 보기(관심 지역)
export type PlanName = "신청 준비 계획" | "대응 계획" | "재계약 판단 메모" | "관심 지역 다시 보기";

const REJECT_EXAMPLE: Record<PlanName, string> = {
  "신청 준비 계획": "예: 자격이 안 됨", "대응 계획": "예: 이미 환기·제습을 하고 있음",
  "재계약 판단 메모": "예: 이미 이사하기로 정함", "관심 지역 다시 보기": "예: 이 지역은 더 안 봄",
};

// IA IC_020101_MD 대응안 승인, IC_020102_MD 대응안 거절 (FR-011, FR-012, spec 001)
// spec 003 FR-012 수용 기준 2: 승인 창은 알림 종류에 맞는 계획 이름을 말한다
export function DecisionPanel({ incidentId, planName }: { incidentId: string; planName: PlanName }) {
  const approveDialog = useRef<HTMLDialogElement>(null);
  const rejectDialog = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<DecisionState>({});
  const [which, setWhich] = useState<"approve" | "reject">("approve");
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  const run = (kind: "approve" | "reject", action: () => Promise<DecisionState>, dialog: HTMLDialogElement | null) =>
    startTransition(async () => {
      setWhich(kind);
      const result = await action();
      setState(result);
      if (result.done) dialog?.close();
    });

  if (state.done === "approved") {
    return (
      <p className={styles.success} role="status">
        내 일정에 넣었습니다. {state.scheduleId ? <Link href={`/schedule/${state.scheduleId}`}>일정 보기</Link> : null}
      </p>
    );
  }
  if (state.done === "rejected") return <p className={styles.success} role="status">거절했습니다. 일정은 바뀌지 않았습니다.</p>;

  return (
    <div className={styles.decision}>
      <button type="button" className={styles.approve} onClick={() => approveDialog.current?.showModal()}>승인</button>
      <button type="button" className={styles.reject} onClick={() => rejectDialog.current?.showModal()}>거절</button>

      <dialog ref={approveDialog} className={styles.dialog} aria-labelledby="approve-title">
        <h2 id="approve-title">{withObject(planName)} 승인할까요?</h2>
        <p>승인하면 체크리스트와 마감일이 내 일정에 들어갑니다.</p>
        {state.error && which === "approve" ? <p className={styles.error} role="alert">{state.error}</p> : null}
        <div className={styles.dialogButtons}>
          <button type="button" className={styles.approve} disabled={pending}
            onClick={() => run("approve", () => approveIncident(incidentId), approveDialog.current)}>
            {pending ? "처리 중…" : "승인"}
          </button>
          <button type="button" className={styles.cancel} onClick={() => approveDialog.current?.close()}>취소</button>
        </div>
      </dialog>

      <dialog ref={rejectDialog} className={styles.dialog} aria-labelledby="reject-title">
        <h2 id="reject-title">이 알림의 계획을 거절할까요?</h2>
        <label htmlFor="reject-reason">거절 사유 (필수)</label>
        <input id="reject-reason" className={styles.input} value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder={REJECT_EXAMPLE[planName]} aria-describedby="reject-error" />
        {state.error && which === "reject" ? <p id="reject-error" className={styles.error} role="alert">{state.error}</p> : null}
        <div className={styles.dialogButtons}>
          <button type="button" className={styles.reject} disabled={pending}
            onClick={() => run("reject", () => rejectIncident(incidentId, reason), rejectDialog.current)}>
            {pending ? "처리 중…" : "거절"}
          </button>
          <button type="button" className={styles.cancel} onClick={() => rejectDialog.current?.close()}>취소</button>
        </div>
      </dialog>
    </div>
  );
}
