import type { ContractType, HousingType } from "@/incident/home-form";

// 국토부 전월세 실거래가 응답 → 거래. 순수 함수. 2026-11-18 실제 응답(4개 API)으로 칸 확인 (spec 008 FR-002·003)

/** 거래 한 건. 금액은 원, 면적은 ㎡. dealYm "YYYY-MM" */
export type Trade = {
  housingType: HousingType; sigunguCode: string; dealYm: string; areaM2: number;
  contractType: ContractType; deposit: number; monthlyRent: number;
};

type RtmsItem = {
  sggCd?: number | string; dealYear?: number | string; dealMonth?: number | string;
  deposit?: number | string; monthlyRent?: number | string; excluUseAr?: number | string; totalFloorAr?: number | string;
};

export type RtmsParseResult = { ok: true; trades: Trade[]; skipped: number; totalCount: number } | { ok: false; error: string };

const RESULT_OK = "000";
const MANWON = 10_000;

/** E8: "13,500"(글자, 쉼표) 또는 13500(숫자), 만원 → 원. 읽을 수 없으면 null */
function won(value: number | string | undefined): number | null {
  const text = String(value ?? "").replaceAll(",", "").trim();
  return /^\d+$/.test(text) ? Number(text) * MANWON : null;
}

function positive(value: number | string | undefined): number | null {
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

// 단독·다가구 API에는 전용면적이 없고 연면적만 있다. 사용자 결정(2026-11-18): 연면적으로 ±20% 비교
function toTrade(item: RtmsItem, housingType: HousingType): Trade | null {
  const deposit = won(item.deposit);
  const monthlyRent = won(item.monthlyRent);
  const areaM2 = positive(housingType === "detached" ? item.totalFloorAr : item.excluUseAr);
  const year = Number(item.dealYear);
  const month = Number(item.dealMonth);
  const sigunguCode = String(item.sggCd ?? "").trim();
  if (deposit === null || monthlyRent === null || areaM2 === null || !/^\d{5}$/.test(sigunguCode) || !(month >= 1 && month <= 12) || !(year > 2000)) return null;
  return {
    housingType, sigunguCode, dealYm: `${year}-${String(month).padStart(2, "0")}`, areaM2,
    contractType: monthlyRent > 0 ? "monthly" : "jeonse", deposit, monthlyRent,
  };
}

type RawResponse = {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: { items?: { item?: RtmsItem | RtmsItem[] } | ""; totalCount?: number };
  };
};

/** spec 008 FR-002, E7: 오류 코드·다른 모양이면 수집 오류 */
export function parseRtmsResponse(raw: unknown, housingType: HousingType): RtmsParseResult {
  const response = (typeof raw === "object" && raw !== null ? raw : {}) as RawResponse;
  const header = response.response?.header;
  if (!header?.resultCode) return { ok: false, error: "실거래가 응답 형식이 다릅니다" };
  if (header.resultCode !== RESULT_OK) return { ok: false, error: `실거래가 응답 오류 ${header.resultCode}: ${header.resultMsg ?? ""}` };
  const body = response.response?.body;
  const container = body?.items;
  const items = container && typeof container === "object" && container.item !== undefined ? ([] as RtmsItem[]).concat(container.item) : [];
  const trades = items.map((item) => toTrade(item, housingType)).filter((t): t is Trade => t !== null);
  return { ok: true, trades, skipped: items.length - trades.length, totalCount: body?.totalCount ?? items.length };
}

/**
 * spec 008 FR-002: 실행 달의 앞 3개월 "YYYYMM"(최근 것부터). 이번 달은 신고가 덜 들어와 뺀다.
 * @param today 한국 날짜 "YYYY-MM-DD". 현재 시각은 부르는 쪽에서 넘긴다
 */
export function recentDealMonths(today: string, count = 3): string[] {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  return Array.from({ length: count }, (_, i) => {
    const index = year * 12 + (month - 1) - (i + 1);
    return `${Math.floor(index / 12)}${String((index % 12) + 1).padStart(2, "0")}`;
  });
}
