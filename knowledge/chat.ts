// spec 004 v0.3 FR-007 (사용자 결정 2026-11-18): 챗봇은 내 처리 기록과 공공데이터로만 답한다. 순수 함수
// 임베딩(ERD Q1)을 정하기 전이라 질문 낱말이 겹치는 자료를 고른다. 답마다 쓴 자료(출처)를 돌려준다

// v0.5(2026-11-19): policy·interest_home·defect 추가
export type ChatSourceKind = "alert" | "schedule" | "notice" | "forecast" | "home" | "policy" | "interest_home" | "defect";
export type ChatSource = { id: string; kind: ChatSourceKind; title: string; text: string; href?: string };

const KIND_LABEL: Record<ChatSourceKind, string> = {
  alert: "내 처리 기록: 위험·기회 알림",
  schedule: "내 처리 기록: 내 일정",
  notice: "공공데이터: 마이홈 공고",
  forecast: "공공데이터: 기상청 예보",
  home: "내 정보: 내 집",
  policy: "공공데이터: 온통청년 정책",
  interest_home: "내 정보: 관심 주택",
  defect: "내 정보: 하자 기록",
};

export function sourceLabel(kind: ChatSourceKind): string {
  return KIND_LABEL[kind];
}

/** 질문 낱말. 두 글자 이상만, 끝의 조사 한 글자를 뗀 꼴도 함께(예: "마감이" → "마감") */
export function questionWords(question: string): string[] {
  const words = question.split(/[^0-9A-Za-z가-힣]+/).filter((word) => word.length >= 2);
  return [...new Set(words.flatMap((word) => (word.length >= 3 ? [word, word.slice(0, -1)] : [word])))];
}

/** 질문 낱말이 많이 겹치는 자료부터 limit개. 하나도 안 겹치는 자료는 뺀다 */
export function rankSources(question: string, sources: readonly ChatSource[], limit: number): ChatSource[] {
  const words = questionWords(question);
  return sources
    .map((source, order) => {
      const haystack = `${source.title} ${source.text}`;
      return { source, order, score: words.filter((word) => haystack.includes(word)).length };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, limit)
    .map((item) => item.source);
}

export const CHAT_SYSTEM_PROMPT = [
  "너는 혼자 사는 사회초년생을 돕는 HomeFit 챗봇이다. 쉬운 한국어로 짧게 답한다.",
  "아래 [S번호] 자료만 근거로 쓴다. 자료에 없는 내용은 지어내지 않는다.",
  "답하는 문장 끝에 근거 자료 번호를 [S1]처럼 단다. sources에는 쓴 자료 번호만 넣는다.",
  "자료로 답할 수 없으면 \"내 기록과 공공데이터에서 찾지 못했습니다.\"라고만 답한다.",
  "신청 자격은 판정하지 않고 공고문에서 확인하라고 안내한다. 결로 숫자를 말할 때만 추정값이라고 밝힌다.",
  "금액은 자료에 적힌 값만 쓰고 새로 계산하지 않는다. 미입력 항목은 미입력이라고 밝힌다. 하자의 원인·책임은 판정하지 않는다.",
].join("\n");

export const CHAT_JSON_SCHEMA = {
  type: "object",
  properties: { answer: { type: "string" }, sources: { type: "array", items: { type: "string" } } },
  required: ["answer", "sources"],
  additionalProperties: false,
} as const;

/** 사용자를 알 수 있는 값(이메일·회원 ID)은 자료에 넣지 않는다(spec 002 Q23과 같은 원칙) */
export function buildChatPrompt(question: string, sources: readonly ChatSource[]): string {
  const lines = sources.map((s) => `[${s.id}] (${KIND_LABEL[s.kind]}) ${s.title}: ${s.text}`);
  return ["자료:", ...lines, "", `질문: ${question}`].join("\n");
}

const MAX_ANSWER = 1200;

/** AI 답 검사. 실제로 준 자료 번호만 남긴다. 모양이 다르거나 비면 null */
export function parseChatAnswer(raw: unknown, allowedIds: ReadonlySet<string>): { answer: string; sourceIds: string[] } | null {
  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as { answer?: unknown; sources?: unknown };
  if (typeof record.answer !== "string" || !Array.isArray(record.sources)) return null;
  const answer = record.answer.trim().slice(0, MAX_ANSWER);
  if (answer === "") return null;
  const sourceIds = [...new Set(record.sources.filter((id): id is string => typeof id === "string" && allowedIds.has(id)))];
  return { answer, sourceIds };
}
