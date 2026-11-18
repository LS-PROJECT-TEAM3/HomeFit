import { HistorySearch } from "./history-search";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "기록 찾기 | AI 도우미 | HomeFit AI" };

// IA KN_050000_PG 기록 찾기 (PRD FR-18, spec 005 FR-006): 승인·거절로 끝난 알림에서 찾고, 찾은 기록만 근거로 답한다
export default function KnowledgeAskPage() {
  return (
    <section className={styles.card} aria-labelledby="ask-title">
      <h2 id="ask-title">기록 찾기</h2>
      <p className={styles.muted}>승인하거나 거절한 위험·기회 알림에서 찾습니다. 답은 찾은 기록만 근거로 하고, 기록마다 알림 링크를 붙입니다. 아직 처리 중인 알림과 공공데이터는 오른쪽 아래 챗봇에 물어보세요.</p>
      <HistorySearch />
    </section>
  );
}
