import styles from "./energy.module.css";

// spec 011 FR-003 → spec 022 FR-012(캔버스 v2-energy-pc, DS MonthBars): 12개월 예상 요금 막대. 이번 달은 초록, 가장 많은 달은 갈색 + 글자 표시.
// 휴대폰은 가로 막대 목록(인수인계 4-4)
const BAR_MAX = 200;

export function BillChart({ values, month, currentText, maxText }: { values: number[]; month: number; currentText: string; maxText: string | null }) {
  const man = values.map((v) => v / 10_000);
  const max = Math.max(...man);
  // 모든 달이 같으면 "가장 많음"을 붙이지 않는다(어느 달도 더 많지 않음)
  const maxIdx = Math.min(...man) === max ? -1 : man.indexOf(max);
  const tag = (i: number) => (i + 1 === month ? <span className={styles.barTag}>이번 달</span> : i === maxIdx ? <span className={`${styles.barTag} ${styles.barTagMax}`}>가장 많음</span> : null);
  const tone = (i: number) => `${i + 1 === month ? styles.isCurrent : ""} ${i === maxIdx ? styles.isMax : ""}`;
  return (
    <div className={styles.bars}>
      <div className={styles.barsHead}><span className={styles.greyPill}>모두 예상값</span><span className={styles.barsUnit}>단위 만 원</span></div>
      <ol className={styles.barsList} aria-label="12개월 예상 요금, 단위 만 원">
        {man.map((v, i) => (
          <li key={i} className={`${styles.barsCol} ${tone(i)}`}>
            <div className={styles.barsTagRow}>{tag(i)}</div>
            <div className={styles.barsArea}>
              <span className={styles.barsVal}>{v.toFixed(1)}만</span>
              <div className={styles.barsBar} style={{ height: Math.round((v / max) * BAR_MAX) }} />
            </div>
            <span className={styles.barsMonth}>{i + 1}월</span>
          </li>
        ))}
      </ol>
      <ol className={styles.hbars} aria-label="12개월 예상 요금, 단위 만 원">
        {man.map((v, i) => (
          <li key={i} className={`${styles.hbarRow} ${tone(i)}`}>
            <span className={styles.hbarMonth}>{i + 1}월</span>
            <span className={styles.hbarTrack}><span className={styles.hbarFill} style={{ width: `${Math.round((v / max) * 100)}%` }} /></span>
            <span className={styles.hbarVal}>{v.toFixed(1)}만</span>
            {tag(i)}
          </li>
        ))}
      </ol>
      <div className={styles.barsLegend}>
        <span><span className={`${styles.barsSq}`} aria-hidden="true" /><b className={styles.legendCurrent}>이번 달</b> {currentText}</span>
        {maxIdx >= 0 && maxText ? <span><span className={`${styles.barsSq} ${styles.barsSqMax}`} aria-hidden="true" /><b className={styles.legendMax}>가장 많은 달</b> {maxText}</span> : <span>달마다 같은 요금이에요</span>}
      </div>
    </div>
  );
}
