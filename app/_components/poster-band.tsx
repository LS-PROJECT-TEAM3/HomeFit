import type { ReactNode } from "react";
import styles from "./poster-band.module.css";

// spec 022 FR-011, 디자인 시스템 PosterBand(Size=Home). 다른 화면용(제목 60px·항목 표·폴더 탭)은 그 화면 PR에서 더한다
// PC(960px 이상)에서만 보인다. 휴대폰 포스터형은 아직 정하지 않아(spec Q2) 화면이 기본형 머리말을 따로 둔다

export function PosterBand({ title, subtitle, numberLabel, bigNumber, unit, numberNote }: {
  title: string; subtitle?: ReactNode; numberLabel: string; bigNumber: number; unit: string; numberNote?: string;
}) {
  return (
    <section className={styles.band} aria-labelledby="poster-title">
      <div className={styles.grid}>
        {/* 요약을 위, 제목을 아래로: 오른쪽 "오늘 확인할 일"(위)·숫자(아래)와 짝을 맞춘다(사용자 요청 2026-11-21) */}
        <div>
          {subtitle ? <p className={styles.sub}>{subtitle}</p> : null}
          <h1 id="poster-title" className={styles.title}>{title}</h1>
        </div>
        <div className={styles.figure}>
          <p className={styles.label}>{numberLabel}</p>
          <p className={styles.number}>{bigNumber}{unit}</p>
          {numberNote ? <p className={styles.note}>{numberNote}</p> : null}
        </div>
      </div>
    </section>
  );
}
