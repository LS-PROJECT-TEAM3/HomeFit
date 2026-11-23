// spec 005 FR-006 (PRD FR-18, IA KN_050000_PG): 기록 찾기. 끝난 알림(승인·거절)을 찾기 자료로 만들고 낱말로 고른다. 순수 함수
// 임베딩(ERD Q1)은 아직 정하지 않아 챗봇(spec 004 FR-007)과 같은 낱말 겹침으로 고른다
import { CHAT_SYSTEM_PROMPT, rankSources, type ChatSource } from "@/knowledge/chat";

export type ClosedIncidentRow = {
  id: string; status: string; incidentType: string; title: string; closedAt: string | null; reason: string | null; todo: readonly string[];
};

const RESULT_TEXT: Record<string, string> = { approved: "승인함", rejected: "거절함" };
const TYPE_TEXT: Record<string, string> = { housing_support: "주거 기회(공고 변화)", humidity_condensation: "위험(습도·결로)", rent_price_change: "시세 변화" };
const MAX_RESULTS = 8;

export const HISTORY_NOT_FOUND = "기록에서 찾지 못했습니다.";

// 챗봇 지시문과 같고, 근거가 처리 기록뿐이라 "찾지 못함" 문장만 바꾼다
export const HISTORY_SYSTEM_PROMPT = CHAT_SYSTEM_PROMPT.replace("내 기록과 공공데이터에서 찾지 못했습니다.", HISTORY_NOT_FOUND);

export type HistoryResult = "approved" | "rejected";
/** 찾기 자료 + 화면용(spec 022 v2-know-poster-pc: 처리 결과 색 줄, 처리한 날, 한 줄 요약) */
export type HistoryRecord = ChatSource & { result: HistoryResult; date: string | null; summary: string };

/** 한국 날짜 "2026.11.03" */
export function dotDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }).replaceAll("-", ".");
}

function summaryOf(row: ClosedIncidentRow): string {
  if (row.status === "rejected") return row.reason ? `거절 사유: ${row.reason}` : "일정을 만들지 않았어요";
  return row.todo.length > 0 ? `승인한 할 일: ${row.todo.join(", ")}` : "승인했어요";
}

/** 승인·거절로 끝난 알림만. 날짜는 처리한 날(한국 날짜) */
export function toHistoryRecords(rows: readonly ClosedIncidentRow[]): HistoryRecord[] {
  return rows
    .filter((row) => row.status in RESULT_TEXT)
    .map((row, i) => {
      const parts = [
        TYPE_TEXT[row.incidentType] ?? "알림",
        `${RESULT_TEXT[row.status]}${row.reason ? `(거절 사유: ${row.reason})` : ""}`,
        row.closedAt ? `처리한 날 ${new Date(row.closedAt).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" })}` : "",
        row.todo.length > 0 ? `할 일: ${row.todo.join(", ")}` : "",
      ].filter(Boolean);
      return {
        id: `R${i + 1}`, kind: "alert" as const, title: row.title, text: parts.join(" · "), href: `/incidents/${row.id}`,
        result: row.status as HistoryResult, date: row.closedAt ? dotDate(row.closedAt) : null, summary: summaryOf(row),
      };
    });
}

export function findRecords(question: string, records: readonly HistoryRecord[]): HistoryRecord[] {
  return rankSources(question, records, MAX_RESULTS);
}

/** AI 답의 근거 번호 [R7]을 찾은 기록 순서 [1]로 바꾼다(보드처럼 화면 목록 번호와 맞춤). 목록에 없는 번호는 지운다 */
export function numberCitations(answer: string, hitIds: readonly string[]): string {
  return answer
    .replace(/\s*\[(R\d+)\]/g, (_m, id: string) => (hitIds.includes(id) ? ` [${hitIds.indexOf(id) + 1}]` : ""))
    .trim();
}

/** 처리 기록을 달마다 묶는다(v2-know-log-pc "2026년 11월"). 들어온 순서(최근 먼저)를 지킨다 */
export function groupByMonth<T extends { closedAt: string | null }>(rows: readonly T[]): { label: string; rows: T[] }[] {
  const groups: { label: string; rows: T[] }[] = [];
  for (const row of rows) {
    const label = row.closedAt ? monthLabel(row.closedAt) : "날짜 없음";
    const last = groups.at(-1);
    if (last?.label === label) last.rows.push(row);
    else groups.push({ label, rows: [row] });
  }
  return groups;
}

function monthLabel(iso: string): string {
  const [y, m] = dotDate(iso).split(".");
  return `${y}년 ${Number(m)}월`;
}
