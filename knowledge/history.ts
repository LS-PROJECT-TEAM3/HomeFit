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

/** 승인·거절로 끝난 알림만. 날짜는 처리한 날(한국 날짜) */
export function toHistoryRecords(rows: readonly ClosedIncidentRow[]): ChatSource[] {
  return rows
    .filter((row) => row.status in RESULT_TEXT)
    .map((row, i) => {
      const parts = [
        TYPE_TEXT[row.incidentType] ?? "알림",
        `${RESULT_TEXT[row.status]}${row.reason ? `(거절 사유: ${row.reason})` : ""}`,
        row.closedAt ? `처리한 날 ${new Date(row.closedAt).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" })}` : "",
        row.todo.length > 0 ? `할 일: ${row.todo.join(", ")}` : "",
      ].filter(Boolean);
      return { id: `R${i + 1}`, kind: "alert" as const, title: row.title, text: parts.join(" · "), href: `/incidents/${row.id}` };
    });
}

export function findRecords(question: string, records: readonly ChatSource[]): ChatSource[] {
  return rankSources(question, records, MAX_RESULTS);
}
