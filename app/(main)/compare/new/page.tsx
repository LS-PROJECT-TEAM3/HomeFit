import { SkeletonNotice } from "@/app/_components/page-status";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "관심 주택 등록 | HomeFit AI" };

const FIELDS = [
  ["name", "이름(내가 알아볼 이름)", "예: 역 앞 오피스텔"],
  ["sigungu", "시군구", "예: 경기 시흥시"],
  ["area", "전용면적(㎡ 또는 평)", "예: 20"],
  ["deposit", "보증금(원)", "예: 5000000"],
  ["rent", "월세(원)", "예: 450000"],
  ["fee", "관리비(원)", "예: 70000"],
] as const;

// IA CP_040100_PG 관심 주택 등록 (PRD FR-28). spec 004 뼈대: 칸 모양만, 저장하지 않는다
export default function CompareNewPage() {
  return (
    <section className={styles.card} aria-labelledby="new-title">
      <h2 id="new-title">관심 주택 등록</h2>
      <SkeletonNotice>입력 칸 모양만 있습니다. 저장(ERD interest_homes)은 다음 단계에서 만들기 때문에 지금은 저장 버튼이 꺼져 있습니다.</SkeletonNotice>
      <form className={styles.form} aria-describedby="compare-new-help">
        {FIELDS.map(([name, label, placeholder]) => (
          <div key={name} className={styles.field}>
            <label htmlFor={`compare-${name}`}>{label}</label>
            <input id={`compare-${name}`} name={name} className={styles.input} placeholder={placeholder} />
          </div>
        ))}
        <button type="button" className={styles.input} disabled>저장 (다음 단계)</button>
      </form>
      <p id="compare-new-help" className={styles.muted}>상세 주소는 받지 않습니다. 시군구까지만 넣습니다.</p>
    </section>
  );
}
