import { buildDefaultChecklist, type ChecklistItem } from "@/incident/checklist";
import type { Notice } from "@/watch/notice";

// FR-010 (spec 001): Claude에게 줄 지시와 받은 초안을 다루는 순수 함수. 호출은 plan-draft.server.ts

export const PLAN_SYSTEM_PROMPT = [
  "너는 독립을 준비하는 사회초년생에게 공공임대 모집 공고를 쉬운 한국어로 설명한다.",
  "주어진 공고 원문 값만 쓴다. 원문에 없는 자격 조건, 서류, 금액, 날짜는 지어내지 않는다.",
  "신청 자격이 되는지 판단하지 않는다. 자격은 공고문에서 확인하라고 안내한다.",
  "summary: 3~4문장. 무엇을 모집하는지, 어디인지, 언제까지 신청하는지, 무엇을 먼저 해야 하는지.",
  "checklist: 신청 준비에 할 일 3~6개. 한 항목은 한 문장, 40자 안팎. 날짜는 쓰지 않는다(마감일은 따로 붙인다).",
].join("\n");

export const PLAN_JSON_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    checklist: {
      type: "array",
      items: {
        type: "object",
        properties: { label: { type: "string" } },
        required: ["label"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "checklist"],
  additionalProperties: false,
} as const;

const MAX_SUMMARY = 800;
const MAX_ITEMS = 10;
const MAX_LABEL = 120;

function field(name: string, value: string | number | null): string {
  return `${name}: ${value === null || value === "" ? "공고문 확인" : value}`;
}

export function buildPlanPrompt(notice: Notice): string {
  return [
    "다음 공고로 요약과 신청 준비 체크리스트를 만들어 줘.",
    field("공고명", notice.title),
    field("공급 유형", notice.supplyType),
    field("공고일", notice.announcedOn),
    field("접수 시작일", notice.applyStart),
    field("접수 마감일", notice.applyEnd),
    field("월 임대료", notice.monthlyRent),
    field("공고 링크", notice.url),
  ].join("\n");
}

export type PlanDraft = { summary: string; labels: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Claude가 돌려준 JSON을 검사한다. 모양이 다르거나 비면 null(실패 → 기본 체크리스트) */
export function parsePlanDraft(raw: unknown): PlanDraft | null {
  if (!isRecord(raw) || typeof raw.summary !== "string" || !Array.isArray(raw.checklist)) return null;
  const summary = raw.summary.trim();
  if (summary === "" || summary.length > MAX_SUMMARY) return null;
  const labels: string[] = [];
  for (const item of raw.checklist) {
    if (!isRecord(item) || typeof item.label !== "string") return null;
    const label = item.label.trim().slice(0, MAX_LABEL);
    if (label !== "") labels.push(label);
  }
  if (labels.length === 0) return null;
  return { summary, labels: labels.slice(0, MAX_ITEMS) };
}

/** AI 항목 + 원문 마감일 항목. 마감일은 AI 글이 아니라 원문 값으로 붙인다 (FR-010 수용 기준 3) */
export function composeChecklist(labels: readonly string[], notice: Notice): ChecklistItem[] {
  const defaults = buildDefaultChecklist(notice);
  const items: ChecklistItem[] = labels.map((label) => ({ label, dueOn: null }));
  if (!labels.some((label) => label.includes("공고문"))) items.unshift(defaults[0]);
  items.push(defaults[defaults.length - 1]);
  return items;
}
