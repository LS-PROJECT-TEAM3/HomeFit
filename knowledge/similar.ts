// spec 010 FR-002 (PRD FR-18, IA IC_020100_PG): 알림 상세의 비슷한 지난 알림. 순수 함수
// 임베딩(ERD Q1)을 정하기 전이라 기록 찾기와 같은 낱말 겹침으로 고른다. AI를 부르지 않는다
import { questionWords } from "@/knowledge/chat";
import type { ClosedIncidentRow } from "@/knowledge/history";

export const SIMILAR_LIMIT = 3;

export type SimilarIncident = { id: string; title: string; result: string; closedOn: string | null; href: string };

type Current = { id: string; incidentType: string; title: string };

function resultText(row: ClosedIncidentRow): string {
  if (row.status === "approved") return "승인함";
  return row.reason ? `거절함 (사유: ${row.reason})` : "거절함";
}

function kstDate(iso: string | null): string | null {
  return iso ? new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }) : null;
}

/** 같은 종류의 끝난 알림 중 자기 자신을 빼고, 제목 낱말이 많이 겹치는 순(같으면 최근에 끝낸 순) 최대 3건 */
export function findSimilarIncidents({ current, closed }: { current: Current; closed: readonly ClosedIncidentRow[] }): SimilarIncident[] {
  const words = questionWords(current.title);
  return closed
    .filter((row) => row.id !== current.id && row.incidentType === current.incidentType && (row.status === "approved" || row.status === "rejected"))
    .map((row) => ({ row, score: words.filter((word) => row.title.includes(word)).length }))
    .sort((a, b) => b.score - a.score || (b.row.closedAt ?? "").localeCompare(a.row.closedAt ?? ""))
    .slice(0, SIMILAR_LIMIT)
    .map(({ row }) => ({ id: row.id, title: row.title, result: resultText(row), closedOn: kstDate(row.closedAt), href: `/incidents/${row.id}` }));
}
