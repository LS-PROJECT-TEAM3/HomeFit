import Link from "next/link";
import { LoadError } from "@/app/_components/states";
import { loadClosedRows } from "@/knowledge/history.server";
import { findSimilarIncidents, type SimilarIncident } from "@/knowledge/similar";
import styles from "./detail.module.css";

type Current = { id: string; incidentType: string; title: string };

// spec 010 FR-002 (PRD FR-18, IA IC_020100_PG): 비슷한 지난 알림 최대 3건. 내 끝난 알림만 로그인 권한(RLS)으로 읽는다
export async function SimilarIncidents({ current, userId }: { current: Current; userId: string }) {
  let similar: SimilarIncident[];
  try {
    similar = findSimilarIncidents({ current, closed: await loadClosedRows(userId) });
  } catch {
    return <LoadError>비슷한 지난 알림을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  return (
    <section className={styles.card} aria-labelledby="similar-title">
      <h2 id="similar-title" className={styles.sectionTitle}>비슷한 지난 알림</h2>
      {similar.length === 0 ? (
        <p className={styles.notice}>비슷한 지난 알림이 없습니다.</p>
      ) : (
        <ul className={styles.checklist}>
          {similar.map((item) => (
            <li key={item.id}>
              <Link href={item.href}>{item.title}</Link>
              <span className={styles.due}> · {item.result}{item.closedOn ? ` · ${item.closedOn}` : ""}</span>
            </li>
          ))}
        </ul>
      )}
      <p className={styles.source}>내가 승인·거절로 끝낸 같은 종류의 알림 중 제목이 많이 겹치는 순입니다.</p>
    </section>
  );
}
