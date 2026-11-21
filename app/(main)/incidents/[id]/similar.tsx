import Link from "next/link";
import { LoadError } from "@/app/_components/states";
import { loadClosedRows } from "@/knowledge/history.server";
import { findSimilarIncidents, type SimilarIncident } from "@/knowledge/similar";
import styles from "./alert.module.css";

type Current = { id: string; incidentType: string; title: string };

// spec 010 FR-002 (PRD FR-18, IA IC_020100_PG): 비슷한 지난 알림 최대 3건. 내 끝난 알림만 로그인 권한(RLS)으로 읽는다
export async function SimilarIncidents({ current, userId }: { current: Current; userId: string }) {
  let similar: SimilarIncident[];
  try {
    similar = findSimilarIncidents({ current, closed: await loadClosedRows(userId) });
  } catch {
    return <LoadError>비슷한 지난 알림을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  // spec 022(v2-s6-pc): 한 줄에 "날짜 제목", 오른쪽에 처리 결과(색 + 글자)
  return (
    <section className={styles.card} aria-labelledby="similar-title">
      <h2 id="similar-title" className={styles.cardTitle}>비슷한 지난 알림</h2>
      {similar.length === 0 ? (
        <p className={styles.help}>비슷한 지난 알림이 없어요.</p>
      ) : (
        <ul className={styles.similar}>
          {similar.map((item) => (
            <li key={item.id}>
              <Link href={item.href} className={styles.similarRow}>
                <span>{item.closedOn ? `${item.closedOn.slice(5).replace("-", ".")} ` : ""}{item.title}</span>
                <b className={item.result.includes("거절") ? styles.rejected : styles.approved}>{item.result}</b>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className={styles.source}>내가 승인/거절로 끝낸 같은 종류의 알림 중 제목 낱말이 겹치는 것만 보여요.</p>
    </section>
  );
}
