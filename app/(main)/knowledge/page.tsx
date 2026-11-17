import { SkeletonNotice } from "@/app/_components/page-status";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "주거 질의응답 | AI 도우미 | HomeFit AI" };

// PRD FR-18 기록 찾기(RAG) 자리. 임베딩 방법(ERD Q1)을 정한 뒤 만든다 (spec 004 뼈대)
export default function KnowledgeAskPage() {
  return (
    <section className={styles.card} aria-labelledby="ask-title">
      <h2 id="ask-title">주거 질의응답</h2>
      <SkeletonNotice>지난 알림·처리 기록과 공공데이터에서 찾아 답하고, 답마다 출처를 보여 줄 자리입니다(PRD FR-18). 임베딩 방법(ERD Q1)을 정한 뒤 만듭니다.</SkeletonNotice>
      <form className={styles.form} aria-label="질문 (다음 단계)">
        <div className={styles.field}>
          <label htmlFor="ask">질문</label>
          <input id="ask" className={styles.input} placeholder="예: 지난겨울 결로 알림에 무엇을 했지?" disabled />
        </div>
        <button type="button" className={styles.input} disabled>묻기 (다음 단계)</button>
      </form>
    </section>
  );
}
