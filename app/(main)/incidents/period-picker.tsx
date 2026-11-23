"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { quickRange } from "@/incident/filter";
import styles from "../notices/notices.module.css";

type Props = { status: string; from: string | null; to: string | null; today: string };

function hrefOf(status: string, from: string | null, to: string | null): string {
  const q = new URLSearchParams();
  if (status !== "all") q.set("status", status);
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  return q.size ? `/incidents?${q.toString()}` : "/incidents";
}

// 사용자 요청(2026-11-23): 기간은 시작일~끝일 날짜 칸. "전체 / 7일 / 30일"은 날짜 칸을 채우는 바로 가기
export function PeriodPicker({ status, from, to, today }: Props) {
  const router = useRouter();
  const go = (nextFrom: string | null, nextTo: string | null) => router.push(hrefOf(status, nextFrom, nextTo), { scroll: false });
  const quick = [
    { label: "전체", range: { from: null, to: null } },
    { label: "7일", range: quickRange(7, today) },
    { label: "30일", range: quickRange(30, today) },
  ];
  return (
    <div className={styles.periodBox} role="group" aria-label="알림 기간">
      {/* 사용자 요청(2026-11-23): 날짜 칸이 먼저, 바로 오른쪽에 붙은 버튼 묶음(전체 | 7일 | 30일). 고른 버튼은 바탕색으로 */}
      <span className={styles.periodDates}>
        <label className={styles.srOnly} htmlFor="period-from">시작일</label>
        <input key={`f${from}`} id="period-from" type="date" className={styles.dateInput} defaultValue={from ?? ""} max={to ?? today} onChange={(e) => go(e.target.value || null, to)} />
        <span aria-hidden="true">~</span>
        <label className={styles.srOnly} htmlFor="period-to">끝일</label>
        <input key={`t${to}`} id="period-to" type="date" className={styles.dateInput} defaultValue={to ?? ""} min={from ?? undefined} max={today} onChange={(e) => go(from, e.target.value || null)} />
      </span>
      <div className={styles.periodQuick}>
        {quick.map(({ label, range }) => {
          const on = range.from === from && range.to === to;
          return <Link key={label} href={hrefOf(status, range.from, range.to)} scroll={false} className={styles.periodSeg} aria-current={on ? "page" : undefined}>{label}</Link>;
        })}
      </div>
    </div>
  );
}
