"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Icon } from "@/app/_components/icons";
import { addPolicyToSchedule, followPolicy, unfollowPolicy } from "./actions";
import styles from "../../notices/[id]/detail.module.css";

// IA PL_090100_PG 정책 상세 머리 (spec 026 FR-001·FR-003, PRD FR-07·FR-16 v1.25): 공고 상세(follow-panel.tsx)와 같은 모양.
// 배지(종류·팔로우 중) + 오른쪽 북마크 버튼, 팔로우하면 "내 일정에 추가". 설명 글은 두지 않는다(사용자 요청 2026-11-23).
// 정책에는 관심 없음이 없다(Q4). 저장 실패면 상태는 그대로 두고 문구만(E7)
type Props = {
  policyId: string; title: string; kindLabel: string | null; agency: string; url: string | null;
  initialFollowed: boolean; initialScheduleId: string | null;
};

export function PolicyHead({ policyId, title, kindLabel, agency, url, initialFollowed, initialScheduleId }: Props) {
  const [followed, setFollowed] = useState(initialFollowed);
  const [scheduleId, setScheduleId] = useState(initialScheduleId);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // 어느 버튼을 처리하는 중인지(일정 버튼의 "넣는 중…"은 일정 넣을 때만)
  const [doing, setDoing] = useState<"toggle" | "add" | null>(null);

  const toggle = () =>
    startTransition(async () => {
      setDoing("toggle");
      const result = followed ? await unfollowPolicy(policyId) : await followPolicy(policyId);
      setError(result.error ?? null);
      if (result.followed !== undefined) setFollowed(result.followed);
      setDoing(null);
    });
  const add = () =>
    startTransition(async () => {
      setDoing("add");
      const result = await addPolicyToSchedule(policyId);
      setError(result.error ?? null);
      if (result.scheduleId) setScheduleId(result.scheduleId);
      setDoing(null);
    });

  return (
    <section className={styles.headCard} aria-labelledby="policy-title">
      <div className={styles.headTop}>
        <span className={styles.badges}>
          {kindLabel ? <span className={`${styles.badge} ${styles.badgeIgnored}`}>{kindLabel}</span> : null}
          {followed ? <span className={`${styles.badge} ${styles.badgeFollow}`}>팔로우 중</span> : null}
        </span>
        <span className={styles.headActions}>
          {/* 공고와 같게: 이름은 그대로 두고 눌림 상태로 알린다. 눌린 버튼을 다시 누르면 팔로우 풀기 */}
          <button type="button" className={`${styles.iconButton} ${followed ? styles.iconOn : ""}`} aria-pressed={followed} aria-label="팔로우" title={followed ? "팔로우 풀기" : "팔로우"}
            disabled={pending} onClick={toggle}><Icon name="bookmark" size={22} /></button>
        </span>
      </div>
      <h1 id="policy-title" className={styles.title}>{title}</h1>
      <div className={styles.headFoot}>
        <span className={styles.announced}>{agency}</span>
        {url ? <a href={url} target="_blank" rel="noopener noreferrer" className={styles.textLink}>정책 원문 보기<span className={styles.srOnly}> (새 창)</span><Icon name="chevron-right" size={18} /></a> : <span className={styles.help}>원문 링크가 없어요. 운영 기관에 문의해 주세요.</span>}
      </div>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {/* FR-003·FR-006: 이미 넣었으면 팔로우와 상관없이 일정 링크. 넣기는 팔로우한 정책만 */}
      {scheduleId ? (
        <p className={styles.scheduleRow} role="status">내 일정에 있어요<Link href={`/schedule/${scheduleId}`} className={styles.textLink}>일정 보기<Icon name="chevron-right" size={18} /></Link></p>
      ) : followed ? (
        <div className={styles.scheduleRow}>
          <button type="button" className={styles.buttonPrimary} disabled={pending} onClick={add}>{pending && doing === "add" ? "넣는 중…" : "내 일정에 추가"}</button>
        </div>
      ) : null}
    </section>
  );
}
