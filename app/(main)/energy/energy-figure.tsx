import Link from "next/link";
import { InfoTip } from "@/app/_components/info-tip";
import styles from "./energy.module.css";

// spec 022 FR-012(캔버스 v2-energy-pc 띠, v2-energy-merged-phone 카드): 이번 달 예상 요금. 모든 금액은 "약"·"추정"으로(확정처럼 보이지 않게)
// 사용자 요청(2026-11-23): 전기 탭과 난방비 탭이 같은 띠·카드를 쓴다

/** 백 원 단위 어림 "48,300" */
export const about = (won: number) => (Math.round(won / 100) * 100).toLocaleString("ko-KR");

/** title: "이번 달 예상 전기요금"처럼. basis: 추정값(어림)인지 계산값(넣은 값)인지. rows: [항목, 값] */
export type EnergyFigure = { title: string; basis: "추정값" | "계산값"; tip: string; total: number; rows: [string, string][]; callout: string | null };

function Rows({ rows, className }: { rows: EnergyFigure["rows"]; className: string }) {
  return (
    <dl className={className}>
      {rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
  );
}

/** PC: 진초록 띠 안 큰 숫자 + 항목 표 + 노란 박스 */
export function BandFigure({ figure }: { figure: EnergyFigure }) {
  return (
    <div className={styles.bandGrid}>
      <div>
        <div className={styles.bandLabelRow}>
          <p className={styles.bandLabel}>{figure.title}</p>
          <span className={styles.bandPill}>{figure.basis} · 부가세 포함</span>
          <span className={styles.bandTip}><InfoTip icon text={figure.tip} label={`${figure.title} 설명 보기`} /></span>
        </div>
        <div className={styles.bandNumRow}>
          <span className={styles.bandPrefix}>약</span>
          <span className={styles.bandNumber}>{about(figure.total)}</span>
          <span className={styles.bandUnit}>원</span>
        </div>
      </div>
      <div className={styles.bandSide}>
        <Rows rows={figure.rows} className={styles.bandRows} />
        {figure.callout ? <div className={styles.callout}>{figure.callout}</div> : null}
      </div>
    </div>
  );
}

/** 휴대폰: 같은 내용을 카드로(보드 v2-energy-merged-phone) */
export function PhoneSummary({ figure }: { figure: EnergyFigure }) {
  return (
    <section className={`${styles.card} ${styles.phoneOnly}`} aria-labelledby="phone-bill-title">
      <div className={styles.cardHeadRow}>
        <span className={styles.cardTitleRow}>
          <h2 id="phone-bill-title" className={styles.cardTitle}>{figure.title}</h2>
          <InfoTip icon text={figure.tip} label={`${figure.title} 설명 보기`} />
        </span>
        <Link href="/my/home" className={styles.arrowLink}><span>내 집에서 입력</span></Link>
      </div>
      <span className={styles.greyPill}>{figure.basis} (부가세 포함)</span>
      <div className={styles.phoneNumRow}>
        <span className={styles.phonePrefix}>약</span>
        <span className={styles.phoneNumber}>{about(figure.total)}</span>
        <span className={styles.phoneUnit}>원</span>
      </div>
      <Rows rows={figure.rows} className={styles.kvRows} />
      {figure.callout ? <div className={styles.callout}>{figure.callout}</div> : null}
    </section>
  );
}
