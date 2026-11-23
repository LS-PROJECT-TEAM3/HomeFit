"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Icon } from "@/app/_components/icons";
import type { FollowDecision } from "@/incident/matched";
import { IGNORE_REASONS } from "@/incident/notice-list";
import { addNoticeToSchedule, clearNoticeDecision, followNotice, ignoreNotice } from "./actions";
import styles from "./detail.module.css";

// IA NT_080100_PG 공고 상세 머리 (FR-020, spec 001 v0.5 → spec 022 캔버스 v2-s4-pc·s4-follow·s4-skip): 상태 배지, 팔로우·관심 없음 버튼,
// 관심 없음 안내 줄, 팔로우하면 내 일정에 추가(spec 007). 관심 없음은 목록과 같은 이유 팝업(NT_080101_MD)
type Props = {
  announcementId: string; title: string; announcedOn: string | null; url: string | null;
  initial: FollowDecision | null; initialScheduleId: string | null; expired: boolean; simulated: boolean;
};

const BADGE: Record<FollowDecision | "new", [string, string]> = { new: ["새 공고", styles.badgeNew], follow: ["팔로우 중", styles.badgeFollow], ignore: ["관심 없음", styles.badgeIgnored] };

export function FollowPanel({ announcementId, title, announcedOn, url, initial, initialScheduleId, expired, simulated }: Props) {
  const [decision, setDecision] = useState<FollowDecision | "new">(initial ?? "new");
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<string>(IGNORE_REASONS[0]);
  const [pending, startTransition] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);

  const run = (action: () => ReturnType<typeof followNotice>) =>
    startTransition(async () => {
      const result = await action();
      setError(result.error ?? null);
      if (result.decision) setDecision(result.decision);
    });
  // spec 023 FR-001·FR-002: 결정을 지워 "새 공고"로. 실패하면 상태는 그대로 두고 문구만(E5)
  const clear = () =>
    startTransition(async () => {
      const result = await clearNoticeDecision(announcementId);
      setError(result.error ?? null);
      if (result.cleared) setDecision("new");
    });
  const [badge, badgeClass] = BADGE[decision];

  return (
    <>
      {decision === "ignore" ? (
        <div className={styles.banner} role="status">
          <span>관심 없음으로 표시한 공고예요. 목록 맨 아래에 모아 둬요.</span>
          <span className={styles.bannerActions}>
            <button type="button" className={styles.bannerAction} disabled={pending} onClick={clear}>관심 없음 취소</button>
            <button type="button" className={styles.bannerAction} disabled={pending} onClick={() => run(() => followNotice(announcementId))}>팔로우로 바꾸기</button>
          </span>
        </div>
      ) : null}
      {/* spec 023 FR-001: 휴대폰은 아이콘 설명이 안 보이니 글자 버튼으로도 둔다 */}
      {decision === "follow" ? (
        <div className={styles.banner} role="status">
          <span>팔로우 중인 공고예요. 이 공고가 바뀌면 알림을 받아요.</span>
          <button type="button" className={styles.bannerAction} disabled={pending} onClick={clear}>팔로우 풀기</button>
        </div>
      ) : null}
      <section className={styles.headCard} aria-labelledby="notice-title">
        <div className={styles.headTop}>
          <span className={styles.badges}>
            <span className={`${styles.badge} ${badgeClass}`}>{badge}</span>
            {expired ? <span className={`${styles.badge} ${styles.badgeClosed}`}>마감</span> : null}
            {simulated ? <span className={`${styles.badge} ${styles.badgeIgnored}`}>가짜 공고</span> : null}
          </span>
          <span className={styles.headActions}>
            {/* spec 023: 눌린 버튼을 다시 누르면 결정을 지운다(팔로우 풀기·관심 없음 취소). 이름은 그대로 두고 눌림 상태로 알린다 */}
            <button type="button" className={`${styles.iconButton} ${decision === "follow" ? styles.iconOn : ""}`} aria-pressed={decision === "follow"} aria-label="팔로우" title={decision === "follow" ? "팔로우 풀기" : "팔로우"}
              disabled={pending} onClick={() => (decision === "follow" ? clear() : run(() => followNotice(announcementId)))}><Icon name="bookmark" size={22} /></button>
            <button type="button" className={`${styles.iconButton} ${decision === "ignore" ? styles.iconOn : ""}`} aria-pressed={decision === "ignore"} aria-label="관심 없음" title={decision === "ignore" ? "관심 없음 취소" : "관심 없음"}
              disabled={pending} onClick={() => { if (decision === "ignore") { clear(); return; } setReason(IGNORE_REASONS[0]); dialog.current?.showModal(); }}><Icon name="ban" size={22} /></button>
          </span>
        </div>
        <h1 id="notice-title" className={styles.title}>{title}</h1>
        <div className={styles.headFoot}>
          <span className={styles.announced}>공고일 {announcedOn ? announcedOn.replaceAll("-", ".") : "공고문 확인"}</span>
          {/* H-006: 마이홈은 바깥에서 들어오면 첫 화면이 열릴 수 있다 */}
          {url ? <a href={url} target="_blank" rel="noopener noreferrer" className={styles.textLink} title="마이홈 첫 화면이 열릴 수 있어요">공고 원문 보기<span className={styles.srOnly}> (새 창)</span><Icon name="chevron-right" size={18} /></a> : null}
        </div>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <ScheduleButton announcementId={announcementId} followed={decision === "follow"} initialScheduleId={initialScheduleId} />
      </section>
      <dialog ref={dialog} className={styles.dialog} aria-labelledby="ignore-title">
        <form method="dialog" className={styles.dialogForm} onSubmit={() => run(() => ignoreNotice(announcementId, reason))}>
          <h2 id="ignore-title" className={styles.dialogTitle}>관심 없는 이유를 골라 주세요</h2>
          <p className={styles.help}>이 공고가 바뀌어도 알림이 생기지 않아요. 나중에 다시 팔로우할 수 있어요.</p>
          <fieldset className={styles.reasons}>
            <legend className={styles.srOnly}>이유</legend>
            {IGNORE_REASONS.map((r) => (
              <label key={r} className={`${styles.reason} ${reason === r ? styles.reasonOn : ""}`}>
                <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} />{r}
              </label>
            ))}
          </fieldset>
          <div className={styles.dialogActions}>
            <button type="button" className={styles.buttonAssistive} onClick={() => dialog.current?.close()}>취소</button>
            <button type="submit" className={styles.buttonPrimary}>관심 없음으로 저장</button>
          </div>
        </form>
      </dialog>
    </>
  );
}

// spec 007 FR-001: 팔로우한 공고를 알림 없이 내 일정에. 누를 때만(사용자 승인)
function ScheduleButton({ announcementId, followed, initialScheduleId }: { announcementId: string; followed: boolean; initialScheduleId: string | null }) {
  const [scheduleId, setScheduleId] = useState<string | null>(initialScheduleId);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (scheduleId) return <p className={styles.scheduleRow} role="status">내 일정에 있어요<Link href={`/schedule/${scheduleId}`} className={styles.textLink}>일정 보기<Icon name="chevron-right" size={18} /></Link></p>;
  if (!followed) return null;
  const add = () =>
    startTransition(async () => {
      const result = await addNoticeToSchedule(announcementId);
      setError(result.error ?? null);
      if (result.scheduleId) setScheduleId(result.scheduleId);
    });
  return (
    <div className={styles.scheduleRow}>
      <span className={styles.help}>알림이 없어도 신청 마감과 준비 체크리스트를 내 일정에 넣어요.</span>
      <button type="button" className={styles.buttonPrimary} disabled={pending} onClick={add}>{pending ? "넣는 중…" : "내 일정에 추가"}</button>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </div>
  );
}
