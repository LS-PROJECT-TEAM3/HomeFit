import type { Notice } from "@/watch/notice";

// 온통청년 정책 응답 한 건(필요한 칸만). Intent Q6: 2026-11-18 실제 응답(주거 424건)으로 확인
export type YouthPolicyItem = {
  plcyNo?: string; plcyNm?: string; mclsfNm?: string; plcyKywdNm?: string; plcyExplnCn?: string; plcySprtCn?: string; operInstCdNm?: string;
  aplyPrdSeCd?: string; aplyYmd?: string; aplyUrlAddr?: string; refUrlAddr1?: string;
  sprtTrgtMinAge?: string | number; sprtTrgtMaxAge?: string | number; zipCd?: string; frstRegDt?: string;
};

/** 신청 기간 종류. period = 기간 있음, always = 상시, unknown = 그 밖(spec 006 Q4: 0057003 뜻 미확인) */
export type PeriodKind = "period" | "always" | "unknown";

/** 정책 한 건. 공고(Notice)와 같은 모양으로 source_items에 저장하고, 나머지는 raw에 남는다 (ERD source_items) */
export type Policy = Notice & {
  minAge: number | null; maxAge: number | null;
  /** 법정동 시군구 코드 목록. 비면 전국 (spec 006 E4) */
  regionCodes: string[];
  agency: string | null; support: string | null; description: string | null; periodKind: PeriodKind;
  /** 정책 키워드(plcyKywdNm, 쉼표). 종류 거르기에 쓴다 (사용자 요청 2026-11-18). 그 전에 저장된 행에는 없을 수 있다 */
  keywords?: string[];
};

export type PolicyParseResult =
  | { ok: true; policies: Policy[]; skipped: number; totalCount: number }
  | { ok: false; error: string };

const PERIOD_CODE = "0057001";
const ALWAYS_CODE = "0057002";
const RANGE = /^(\d{4})(\d{2})(\d{2}) ~ (\d{4})(\d{2})(\d{2})$/;

function text(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function age(value: string | number | undefined): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** spec 006 E1·E2: "YYYYMMDD ~ YYYYMMDD"가 \N(글자 그대로)으로 여러 개 이어질 수 있다 */
export function parseApplyPeriod(raw: string | undefined): { start: string | null; end: string | null } {
  const ranges = (raw ?? "").split("\\N").map((part) => RANGE.exec(part.trim())).filter((m): m is RegExpExecArray => m !== null);
  if (ranges.length === 0) return { start: null, end: null };
  const starts = ranges.map((m) => `${m[1]}-${m[2]}-${m[3]}`).sort();
  const ends = ranges.map((m) => `${m[4]}-${m[5]}-${m[6]}`).sort();
  return { start: starts[0], end: ends[ends.length - 1] };
}

function periodKind(code: string | undefined, end: string | null): PeriodKind {
  if (code === PERIOD_CODE && end) return "period";
  return code === ALWAYS_CODE ? "always" : "unknown";
}

// 지역이 하나면 시도·시군구 칸에도 넣는다(관리자 화면·같은 모양 저장). 여럿이면 목록만 본다
function regions(zipCd: string | undefined) {
  const regionCodes = [...new Set((zipCd ?? "").split(",").map((c) => c.trim()).filter((c) => /^\d{5}$/.test(c)))];
  const single = regionCodes.length === 1 ? regionCodes[0] : null;
  return { regionCodes, sidoCode: single?.slice(0, 2) ?? null, sigunguCode: single };
}

/** spec 006 FR-001: 응답 한 건 → 정책. 정책 ID가 없으면 null(건너뜀) */
export function normalizeYouthPolicy(item: YouthPolicyItem): Policy | null {
  const id = text(item.plcyNo);
  if (!id) return null;
  const { start, end } = parseApplyPeriod(item.aplyYmd);
  const kind = periodKind(item.aplyPrdSeCd, end);
  return {
    externalId: id, announcementId: id, title: text(item.plcyNm) ?? "",
    ...regions(item.zipCd),
    supplyType: text(item.mclsfNm), monthlyRent: null,
    announcedOn: /^\d{4}-\d{2}-\d{2}/.test(item.frstRegDt ?? "") ? item.frstRegDt!.slice(0, 10) : null,
    applyStart: kind === "period" ? start : null, applyEnd: kind === "period" ? end : null,
    url: text(item.aplyUrlAddr) ?? text(item.refUrlAddr1),
    complexName: null, statusName: null, beforeAnnouncementId: null,
    minAge: age(item.sprtTrgtMinAge), maxAge: age(item.sprtTrgtMaxAge),
    agency: text(item.operInstCdNm), support: text(item.plcySprtCn), description: text(item.plcyExplnCn), periodKind: kind,
    keywords: (item.plcyKywdNm ?? "").split(",").map((k) => k.trim()).filter(Boolean),
  };
}

type RawResponse = {
  resultCode?: number | string; resultMessage?: string; errorCode?: string; errorMsg?: string;
  result?: { pagging?: { totCount?: number }; youthPolicyList?: YouthPolicyItem[] };
};

/** spec 006 FR-001·002: 응답 → 정책 목록. 오류 코드나 다른 모양이면 수집 오류 (E6) */
export function parseYouthPolicyResponse(raw: unknown): PolicyParseResult {
  const response = (typeof raw === "object" && raw !== null ? raw : {}) as RawResponse;
  if (response.errorCode) return { ok: false, error: `온통청년 응답 오류 ${response.errorCode}: ${response.errorMsg ?? ""}` };
  if (response.resultCode === undefined) return { ok: false, error: "온통청년 응답 형식이 다릅니다" };
  if (String(response.resultCode) !== "200") return { ok: false, error: `온통청년 응답 오류 ${response.resultCode}: ${response.resultMessage ?? ""}` };
  const items = response.result?.youthPolicyList ?? [];
  const policies = items.map(normalizeYouthPolicy).filter((p): p is Policy => p !== null);
  return { ok: true, policies, skipped: items.length - policies.length, totalCount: response.result?.pagging?.totCount ?? items.length };
}
