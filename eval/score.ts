// spec 005 FR-004 (PRD FR-25, CUJ-04 5단계): 정답 묶음을 실제 감지 규칙(코드)에 넣어 채점한다. DB·AI를 부르지 않는 순수 함수
import { assessCondensationRisk } from "@/incident/condensation";
import { planChangeIncidents } from "@/incident/detect";
import { findNoticeChanges } from "@/incident/notice-change";
import { planRentIncidents } from "@/incident/rent-detect";
import { EVAL_NOW, EVAL_TODAY, type EvalCase, type HumidityCase, type NoticeCase, type RentCase } from "./cases";

export type Tally = { total: number; hit: number; missed: number; falseAlarm: number; quietCorrect: number };
export type CaseResult = { id: string; kind: EvalCase["kind"]; title: string; basis: string; expected: boolean; predicted: boolean };
export type EvalReport = { summary: Tally; byKind: Record<EvalCase["kind"], Tally>; results: CaseResult[] };

export function tally(results: readonly { expected: boolean; predicted: boolean }[]): Tally {
  const count = (expected: boolean, predicted: boolean) => results.filter((r) => r.expected === expected && r.predicted === predicted).length;
  return { total: results.length, hit: count(true, true), missed: count(true, false), falseAlarm: count(false, true), quietCorrect: count(false, false) };
}

const SOURCE = "myhome_notice";

/** 사건 하나가 생기면 울린 것 */
function predictNotice(c: NoticeCase): boolean {
  const previousByExternalId = new Map(c.previous ? [[c.notice.externalId, c.previous]] : []);
  const changes = findNoticeChanges({
    notices: [c.notice], previousByExternalId, today: EVAL_TODAY,
    seenAnnouncementIds: new Set(c.seenAnnouncementIds ?? []), seenComplexKeys: new Set(c.seenComplexKeys ?? []),
  });
  // 팔로우: 공고 자신, 정정이면 이전 공고, 완화면 같은 단지
  const announcements = new Set(c.followed ? [c.notice.announcementId, ...(c.seenAnnouncementIds ?? [])] : []);
  const complexKeys = new Set(c.followed ? (c.seenComplexKeys ?? []) : []);
  const planned = planChangeIncidents({
    changes, owners: [{ userId: "eval-user", condition: c.condition }], existingKeys: new Set(), today: EVAL_TODAY, sourceCode: SOURCE,
    follows: new Map([["eval-user", { announcements, complexKeys }]]),
  });
  return planned.length > 0;
}

function predictHumidity(c: HumidityCase): boolean {
  return assessCondensationRisk({ measurement: c.measurement, windowType: c.windowType, forecast: c.forecast, now: new Date(EVAL_NOW) }).status === "risk";
}

// spec 010 FR-001: 실거래가 수집 뒤와 같은 판단 함수에 넣어 알림이 하나라도 생기면 울린 것
function predictRent(c: RentCase): boolean {
  return planRentIncidents({ homes: c.homes, areas: c.areas, trades: c.trades, runYm: "2026-11", months: ["2026-08", "2026-10"] }).create.length > 0;
}

function predict(c: EvalCase): boolean {
  if (c.kind === "notice") return predictNotice(c);
  if (c.kind === "humidity") return predictHumidity(c);
  return predictRent(c);
}

export function scoreCases(cases: readonly EvalCase[]): EvalReport {
  const results = cases.map((c): CaseResult => ({
    id: c.id, kind: c.kind, title: c.title, basis: c.basis, expected: c.expected,
    predicted: predict(c),
  }));
  return {
    summary: tally(results),
    byKind: { notice: tally(results.filter((r) => r.kind === "notice")), humidity: tally(results.filter((r) => r.kind === "humidity")), rent: tally(results.filter((r) => r.kind === "rent")) },
    results,
  };
}
