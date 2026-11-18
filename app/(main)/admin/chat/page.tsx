import { SkeletonNotice } from "@/app/_components/page-status";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "위키 챗봇 | 관리자 | HomeFit AI" };

// IA AD_070700_TB 위키 챗봇 (PRD FR-26, spec 004 뼈대)
export default function AdminChatPage() {
  return (
    <>
      <SkeletonNotice>위키 쪽만 근거로 답하고 출처를 보여 주며, 없으면 &ldquo;위키에 없습니다&rdquo;라고 답할 자리입니다(PRD FR-26, P3-21). 임베딩 방법(ERD Q1)을 정한 뒤 만듭니다.</SkeletonNotice>
      <form className={styles.form} aria-label="위키 질문 (다음 단계)">
        <div className={styles.field}>
          <label htmlFor="wiki-ask">질문</label>
          <input id="wiki-ask" className={styles.input} placeholder="예: 결로 기준은 어디서 왔나?" disabled />
        </div>
        <button type="button" className={styles.input} disabled>묻기 (다음 단계)</button>
      </form>
    </>
  );
}
