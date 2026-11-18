"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import type { FollowDecision } from "@/incident/matched";
import { addNoticeToSchedule, followNotice, ignoreNotice } from "./actions";
import styles from "../../incidents/[id]/detail.module.css";

const LABEL: Record<FollowDecision | "new", string> = {
  new: "아직 정하지 않았습니다",
  follow: "팔로우 중: 이 공고가 바뀌면 주거 기회 알림으로 알려 드립니다",
  ignore: "관심 없음: 이 공고가 바뀌어도 알리지 않습니다",
};

// IA NT_080100_PG 공고 상세의 팔로우 승인·거절, NT_080101_MD 공고 거절 (FR-020, spec 001 v0.5)
type Props = { announcementId: string; initial: FollowDecision | null; initialScheduleId: string | null };

export function FollowPanel({ announcementId, initial, initialScheduleId }: Props) {
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
      <ScheduleButton announcementId={announcementId} followed={decision === "follow"} initialScheduleId={initialScheduleId} />
      <dialog ref={dialog} className={styles.dialog} aria-labelledby="ignore-title">
        <h2 id="ignore-title">이 공고를 관심 없음으로 할까요?</h2>
        <p>이 공고가 바뀌어도 알림이 생기지 않습니다. 나중에 다시 팔로우할 수 있습니다.</p>
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

// spec 007 FR-001: 팔로우한 공고를 알림 없이 내 일정에. 누를 때만(사용자 승인)
function ScheduleButton({ announcementId, followed, initialScheduleId }: { announcementId: string; followed: boolean; initialScheduleId: string | null }) {
  const [scheduleId, setScheduleId] = useState<string | null>(initialScheduleId);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (scheduleId) return <p role="status">내 일정에 있음 · <Link href={`/schedule/${scheduleId}`}>일정 보기</Link></p>;
  if (!followed) return null;
  const add = () =>
    startTransition(async () => {
      const result = await addNoticeToSchedule(announcementId);
      setError(result.error ?? null);
      if (result.scheduleId) setScheduleId(result.scheduleId);
    });
  return (
    <div>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <button type="button" className={styles.approve} disabled={pending} onClick={add}>
        {pending ? "처리 중…" : "내 일정에 추가"}
      </button>
      <p className={styles.notice}>알림이 없어도 신청 마감과 준비 체크리스트를 내 일정에 넣습니다.</p>
    </div>
  );
}
