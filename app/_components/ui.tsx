import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./icons";
import { InfoTip } from "./info-tip";
import styles from "./ui.module.css";

// spec 022 FR-011: 디자인 시스템(HomeFit DS v1.8.1) 부품을 코드로 옮긴 것. 값은 DS bundle.css 그대로
// 화면마다 다른 안쪽 여백·제목 크기는 CSS 변수(--card-pad, --card-gap, --card-title-size)로 화면 CSS가 정한다

/** Card(Title Style Sans): 흰 칸 + 산세리프 굵은 제목. info는 제목 옆 "i" 설명, meta는 오른쪽 작은 글자 */
export function Card({ title, info, meta, className, children }: {
  title?: string; info?: string; meta?: ReactNode; className?: string; children: ReactNode;
}) {
  return (
    <section className={`${styles.card} ${className ?? ""}`}>
      {title ? (
        <div className={`${styles.cardHead} ${meta ? styles.hasMeta : ""}`}>
          <h2 className={styles.cardTitle}>{title}{info ? <InfoTip text={info} label={`${title} 설명 보기`} /> : null}</h2>
          {meta ? <span className={styles.cardMeta}>{meta}</span> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** AlertRow: 위험·주거 기회 한 줄. 종류는 색과 글자로 (디자인 기본선 5) */
export function AlertRow({ href, kind, title, description }: { href: string; kind: "risk" | "opportunity"; title: string; description?: string }) {
  return (
    <Link href={href} className={styles.alertRow}>
      <span className={styles.alertBody}>
        <span className={kind === "risk" ? styles.kindRisk : styles.kindChance}>{kind === "risk" ? "위험" : "주거 기회"}</span>
        <span className={styles.alertTitle}>{title}</span>
        {description ? <span className={styles.alertDesc}>{description}</span> : null}
      </span>
      <span className={styles.rowArrow}><Icon name="chevron-right" size={22} /></span>
    </Link>
  );
}

/** ScheduleRow: 날짜 칸 + 할 일 + 남은 날. 휴대폰에서는 남은 날이 제목 아래로 */
export function ScheduleRow({ href, date, weekday, title, left, ended }: {
  href: string; date: string; weekday: string; title: string; left: string; ended?: boolean;
}) {
  return (
    <Link href={href} className={styles.schedRow}>
      <span className={styles.schedDate}><span className={styles.schedDay}>{date}</span><span className={styles.schedWeek}>{weekday}</span></span>
      <span className={styles.schedMain}>
        <span className={styles.schedTitle}>{title}</span>
        <span className={`${styles.schedLeft} ${ended ? styles.isEnded : ""}`}>{left}</span>
      </span>
      <span className={styles.rowArrow}><Icon name="chevron-right" size={22} /></span>
    </Link>
  );
}

/** KeyValueRow(Small): 이름 왼쪽, 값 오른쪽 굵게. divider면 위에 선 */
export function KeyValueRow({ label, value, divider }: { label: string; value: string; divider?: boolean }) {
  return (
    <div className={`${styles.kv} ${divider ? styles.kvDivider : ""}`}>
      <span className={styles.kvKey}>{label}</span>
      <span className={styles.kvValue}>{value}</span>
    </div>
  );
}

/** StatItem(Small): 작은 이름 위, 굵은 값 아래 */
export function StatItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>{value}</p>
    </div>
  );
}

/** TextLink(Small): 밑줄 글자 링크 + › */
export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={styles.link}>
      <span className={styles.linkInner}>{children}<span aria-hidden="true">›</span></span>
    </Link>
  );
}
