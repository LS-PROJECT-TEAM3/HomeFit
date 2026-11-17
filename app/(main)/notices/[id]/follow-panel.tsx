"use client";

import { useRef, useState, useTransition } from "react";
import type { FollowDecision } from "@/incident/matched";
import { followNotice, ignoreNotice } from "./actions";
import styles from "../../incidents/[id]/detail.module.css";

const LABEL: Record<FollowDecision | "new", string> = {
  new: "아직 정하지 않았습니다",
  follow: "팔로우 중: 이 공고가 바뀌면 사건과 알림으로 알려 드립니다",
  ignore: "관심 없음: 이 공고가 바뀌어도 알리지 않습니다",
};

// IA NT_080100_PG 공고 상세의 팔로우 승인·거절, NT_080101_MD 공고 거절 (FR-020, spec 001 v0.5)
export function FollowPanel({ announcementId, initial }: { announcementId: string; initial: FollowDecision | null }) {
  const [decision, setDecision] = useState<FollowDecision | "new">(initial ?? "new");
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);

  const run = (action: () => ReturnType<typeof followNotice>) =>
    startTransition(async () => {
      const result = await action();
      setError(result.error ?? null);
      if (result.decision) {
        setDecision(result.decision);
        dialog.current?.close();
      }
    });

  return (
    <section className={styles.card} aria-labelledby="follow-title">
      <h2 id="follow-title" className={styles.sectionTitle}>이 공고를 팔로우할까요?</h2>
      <p role="status"><strong>{LABEL[decision]}</strong></p>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <div className={styles.decision}>
        {decision !== "follow" ? (
          <button type="button" className={styles.approve} disabled={pending} onClick={() => run(() => followNotice(announcementId))}>
            {pending ? "처리 중…" : "승인(팔로우)"}
          </button>
        ) : null}
        {decision !== "ignore" ? (
          <button type="button" className={styles.reject} disabled={pending} onClick={() => dialog.current?.showModal()}>
            거절(관심 없음)
          </button>
        ) : null}
      </div>
      <dialog ref={dialog} className={styles.dialog} aria-labelledby="ignore-title">
        <h2 id="ignore-title">이 공고를 관심 없음으로 할까요?</h2>
        <p>이 공고가 바뀌어도 사건과 알림이 생기지 않습니다. 나중에 다시 팔로우할 수 있습니다.</p>
        <label htmlFor="ignore-reason">사유 (선택)</label>
        <input id="ignore-reason" className={styles.input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: 지역이 멀다" />
        <div className={styles.dialogButtons}>
          <button type="button" className={styles.reject} disabled={pending} onClick={() => run(() => ignoreNotice(announcementId, reason))}>
            {pending ? "처리 중…" : "관심 없음"}
          </button>
          <button type="button" className={styles.cancel} onClick={() => dialog.current?.close()}>취소</button>
        </div>
      </dialog>
    </section>
  );
}
