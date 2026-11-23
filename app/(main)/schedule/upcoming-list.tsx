"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CalendarEvent } from "@/incident/schedule-calendar";
import { toggleChecklistItem } from "./actions";
import styles from "./calendar.module.css";

// spec 022(캔버스 v2-s7-pc): 다가오는 일정. 체크하면 그 할 일을 끝낸 것으로 저장한다(FR-013, 일정 상세 체크리스트와 같은 동작)
const WEEKDAYS = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
const dayText = (date: string) => `${date.slice(5).replace("-", ".")} ${WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()]}`;

export function UpcomingList({ events, deadlines }: { events: CalendarEvent[]; deadlines: string[] }) {
  const router = useRouter();
  const [done, setDone] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const key = (e: CalendarEvent) => `${e.scheduleId}:${e.index}`;
  const toggle = (e: CalendarEvent) => startTransition(async () => {
    const result = await toggleChecklistItem(e.scheduleId, e.index);
    if (result.error) { setError(result.error); return; }
    setError(null);
    setDone((prev) => new Set(prev).add(key(e)));
    router.refresh();
  });
  if (events.length === 0) return <p className={styles.empty}>다가오는 일정이 없어요. 알림에서 계획을 승인하면 여기에 생겨요.</p>;
  return (
    <>
      <ul className={styles.upcoming}>
        {events.map((e) => {
          const checked = done.has(key(e));
          const deadline = deadlines.includes(`${e.scheduleId}:${e.date}`);
          return (
            <li key={key(e)} className={styles.upItem}>
              <input type="checkbox" className={styles.upCheck} checked={checked} disabled={pending || checked} onChange={() => toggle(e)} aria-label={`${e.label} 완료`} />
              <span className={styles.upText}>
                <Link href={`/schedule/${e.scheduleId}`} className={`${styles.upTitle} ${checked ? styles.upDone : ""}`}>{e.label}</Link>
                <span className={styles.upMeta}>{dayText(e.date)}{deadline ? " 마감" : ""} <span className={e.kind === "risk" ? styles.kindRisk : styles.kindPrepare}>| {e.kind === "risk" ? "위험 대응" : e.planTitle}</span></span>
              </span>
            </li>
          );
        })}
      </ul>
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    </>
  );
}
