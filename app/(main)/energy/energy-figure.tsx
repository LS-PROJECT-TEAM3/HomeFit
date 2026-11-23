import Link from "next/link";
import { InfoTip } from "@/app/_components/info-tip";
import type { ElectricityBreakdown } from "@/incident/energy-estimate";
import styles from "./energy.module.css";

// spec 022 FR-012(캔버스 v2-energy-pc 띠, v2-energy-merged-phone 카드): 이번 달 예상 전기요금. 모든 금액은 "약"·"추정"으로(확정처럼 보이지 않게)

/** 백 원 단위 어림 "48,300" */
export const about = (won: number) => (Math.round(won / 100) * 100).toLocaleString("ko-KR");

const BILL_TIP = "기본요금과 전력량요금에 부가세 10%를 더했어요. 기후환경요금, 연료비조정요금, 전력기금 같은 부가 요금은 빠져 있어요.";

type Props = { b: ElectricityBreakdown; kwh: number; estimated: boolean };

function Rows({ b, kwh, className }: Props & { className: string }) {
  return (
    <dl className={className}>
      <div><dt>예상 사용량</dt><dd>{kwh.toLocaleString("ko-KR")}kWh</dd></div>
      <div><dt>전기요금</dt><dd>약 {about(b.bill)}원</dd></div>
      <div><dt>부가세 10%</dt><dd>약 {about(b.vat)}원</dd></div>
    </dl>
  );
}

/** PC: 진초록 띠 안 큰 숫자 + 항목 표 + 노란 박스 */
export function BandFigure(props: Props) {
  const { b, estimated } = props;
  return (
    <div className={styles.bandGrid}>
      <div>
        <div className={styles.bandLabelRow}>
          <p className={styles.bandLabel}>이번 달 예상 전기요금</p>
          <span className={styles.bandPill}>{estimated ? "추정값 · 부가세 포함" : "계산값 · 부가세 포함"}</span>
          <span className={styles.bandTip}><InfoTip icon text={BILL_TIP} label="이번 달 예상 전기요금 설명 보기" /></span>
        </div>
        <div className={styles.bandNumRow}>
          <span className={styles.bandPrefix}>약</span>
          <span className={styles.bandNumber}>{about(b.total)}</span>
          <span className={styles.bandUnit}>원</span>
        </div>
      </div>
      <div className={styles.bandSide}>
        <Rows {...props} className={styles.bandRows} />
        {b.save30 > 0 ? <div className={styles.callout}>30kWh 줄이면 월 약 {about(b.save30)}원 덜 나와요</div> : null}
      </div>
    </div>
  );
}

/** 휴대폰: 같은 내용을 카드로(보드 v2-energy-merged-phone) */
export function PhoneSummary(props: Props) {
  const { b, estimated } = props;
  return (
    <section className={`${styles.card} ${styles.phoneOnly}`} aria-labelledby="phone-bill-title">
      <div className={styles.cardHeadRow}>
        <span className={styles.cardTitleRow}>
          <h2 id="phone-bill-title" className={styles.cardTitle}>이번 달 예상 전기요금</h2>
          <InfoTip icon text={BILL_TIP} label="이번 달 예상 전기요금 설명 보기" />
        </span>
        <Link href="/my/home" className={styles.arrowLink}><span>내 집에서 입력</span></Link>
      </div>
      <span className={styles.greyPill}>{estimated ? "추정값 (부가세 포함)" : "계산값 (부가세 포함)"}</span>
      <div className={styles.phoneNumRow}>
        <span className={styles.phonePrefix}>약</span>
        <span className={styles.phoneNumber}>{about(b.total)}</span>
        <span className={styles.phoneUnit}>원</span>
      </div>
      <Rows {...props} className={styles.kvRows} />
      {b.save30 > 0 ? <div className={styles.callout}>30kWh 줄이면 월 약 {about(b.save30)}원 덜 나와요</div> : null}
    </section>
  );
}
