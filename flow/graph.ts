// spec 005 FR-003 (PRD FR-23, IA AD_070400_TB·AD_070401_MD): 실행 기록(runs·run_steps) → 흐름 상자·화살표. 순수 함수
// 미리 그린 그림이 아니라 기록에서 그린다(CUJ-04 MOT). 상자 상세의 키 값은 가린다(PRD FR-27)
import { maskSecrets } from "@/watch/mask";

export const STEP_NAMES = ["collect", "compare", "detect", "draft_plan", "notify", "await_approval", "record"] as const;
type StepName = (typeof STEP_NAMES)[number];

const STEP_LABEL: Record<StepName, string> = {
  collect: "수집", compare: "비교", detect: "감지", draft_plan: "계획 초안", notify: "슬랙 알림", await_approval: "승인 대기", record: "기록",
};

export type BoxState = "succeeded" | "failed" | "waiting" | "skipped" | "not_reached" | "off";
// CLAUDE.md 디자인: 색과 함께 글자 라벨
export const STATE_LABEL: Record<BoxState, string> = {
  succeeded: "성공", failed: "실패", waiting: "승인 대기", skipped: "건너뜀", not_reached: "도달 못 함", off: "아직 안 켜짐",
};

export type StepRow = { step_name: string; status: string; items_in: number | null; items_out: number | null; detail: unknown };
export type DetailRow = { label: string; value: string };
export type FlowBox = { name: StepName; label: string; state: BoxState; stateLabel: string; itemsIn: number | null; itemsOut: number | null; details: DetailRow[] };
export type FlowArrow = { from: StepName; to: StepName; count: number | null };

// 상세 항목 이름(수집 코드가 남기는 영어 이름) → 화면 글자. 없는 이름은 그대로 보인다
const DETAIL_LABEL: Record<string, string> = {
  error: "오류", base: "예보 기준 시각", failed_sigungu: "실패한 시군구", unknown_sigungu: "격자 모르는 시군구", representative_grid: "대표 격자로 대신함",
  safe: "위험 없음", created: "새 알림", updated: "바뀐 알림", no_forecast: "예보 없음", same_window: "같은 48시간 창(중복 막음)",
  no_measurement: "측정값 없음", stale_measurement: "측정값 오래됨", ai_failed: "AI 실패", ai_drafted: "AI 초안", ai_provider: "AI 공급자",
  ai_failure_reasons: "AI 실패 이유", ai_skipped_by_limit: "상한으로 건너뜀", sent: "보냄", failed: "실패", retried: "다시 시도",
};

// 이름이 키처럼 생긴 항목은 값을 통째로 가린다
const SECRET_FIELD = /key|token|secret|password|authorization/i;

function toState(status: string): BoxState {
  return status === "succeeded" || status === "failed" || status === "waiting" || status === "skipped" ? status : "skipped";
}

function detailRows(detail: unknown, secrets: readonly string[]): DetailRow[] {
  if (detail === null || typeof detail !== "object" || Array.isArray(detail)) return [];
  return Object.entries(detail as Record<string, unknown>).map(([label, raw]) => {
    const text = typeof raw === "string" ? raw : JSON.stringify(raw);
    return { label: DETAIL_LABEL[label] ?? label, value: SECRET_FIELD.test(label) ? "***" : maskSecrets(text, secrets) };
  });
}

/** 기록에 없는 단계는 앞에서 실패했으면 "도달 못 함", 아니면 건너뜀 */
export function buildFlow(steps: readonly StepRow[], secrets: readonly string[]): { boxes: FlowBox[]; arrows: FlowArrow[] } {
  const byName = new Map(steps.map((s) => [s.step_name, s]));
  let failedBefore = false;
  const boxes = STEP_NAMES.map((name): FlowBox => {
    const row = byName.get(name);
    const state: BoxState = row ? toState(row.status) : failedBefore ? "not_reached" : "skipped";
    if (state === "failed") failedBefore = true;
    return {
      name, label: STEP_LABEL[name], state, stateLabel: STATE_LABEL[state],
      itemsIn: row?.items_in ?? null, itemsOut: row?.items_out ?? null, details: row ? detailRows(row.detail, secrets) : [],
    };
  });
  const arrows = boxes.slice(1).map((box, i) => ({ from: boxes[i].name, to: box.name, count: boxes[i].itemsOut }));
  return { boxes, arrows };
}

export const SOURCES = [
  { code: "myhome_notice", label: "마이홈 공고" },
  { code: "kma_forecast", label: "기상청 예보" },
  { code: "youth_policy", label: "온통청년 정책" }, // spec 006 FR-004
  { code: "rtms_trade", label: "실거래가" },
] as const;

/** 시작 상자(출처마다 하나). runs는 최근 것이 앞에 */
export function sourceStarts(runs: readonly { source_code: string; status: string }[]) {
  return SOURCES.map(({ code, label }) => {
    const latest = runs.find((r) => r.source_code === code);
    const state: BoxState = latest ? toState(latest.status) : "off";
    return { code, label, state, stateLabel: STATE_LABEL[state] };
  });
}
