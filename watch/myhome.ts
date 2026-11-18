import type { Notice } from "@/watch/notice";
import { sidoCodeFromName } from "@/watch/sido";

export { sidoCodeFromName };

// 마이홈 공공임대 모집공고 응답 한 건(필요한 칸만). Q6: 2026-11-17 실제 응답으로 확인
export type MyhomeItem = {
  pblancId?: string;
  houseSn?: number | string;
  pblancNm?: string;
  suplyTyNm?: string;
  rcritPblancDe?: string;
  beginDe?: string;
  endDe?: string;
  brtcNm?: string;
  pnu?: string;
  mtRntchrg?: number;
  pcUrl?: string;
  url?: string;
  hsmpNm?: string;
  sttusNm?: string;
  beforePblancId?: string;
};

export type ParseResult =
  | { ok: true; notices: Notice[]; skipped: number; totalCount: number }
  | { ok: false; error: string };

const RESULT_OK = "00";
const RESULT_NO_DATA = "03";

function toIsoDate(yyyymmdd: string | undefined): string | null {
  if (!yyyymmdd || !/^\d{8}$/.test(yyyymmdd)) return null;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

// Q17 처리: pnu 앞 5자리가 법정동 시군구 코드다. 없으면 시도 이름으로 시도만 찾는다
function regionCodes(item: MyhomeItem): { sidoCode: string | null; sigunguCode: string | null } {
  const pnu = item.pnu?.trim() ?? "";
  if (/^\d{5}/.test(pnu)) return { sidoCode: pnu.slice(0, 2), sigunguCode: pnu.slice(0, 5) };
  return { sidoCode: sidoCodeFromName(item.brtcNm ?? ""), sigunguCode: null };
}

/** FR-003 (spec 001): 응답 한 건 → 공고. 공고 ID가 없으면 null(건너뜀) */
export function normalizeMyhomeItem(item: MyhomeItem): Notice | null {
  const pblancId = emptyToNull(item.pblancId);
  if (!pblancId) return null;
  return {
    // 한 공고에 단지가 여럿이라 단지 번호(houseSn)까지 붙여 한 건으로 본다
    externalId: `${pblancId}-${item.houseSn ?? 0}`,
    announcementId: pblancId,
    title: item.pblancNm?.trim() ?? "",
    ...regionCodes(item),
    supplyType: emptyToNull(item.suplyTyNm),
    // Q17 처리: 0원은 "정보 없음"(전세임대 등)으로 본다
    monthlyRent: item.mtRntchrg ? item.mtRntchrg : null,
    announcedOn: toIsoDate(item.rcritPblancDe),
    applyStart: toIsoDate(item.beginDe),
    applyEnd: toIsoDate(item.endDe),
    url: emptyToNull(item.pcUrl) ?? emptyToNull(item.url),
    // FR-016 (spec 001 v0.2): 정정공고·같은 단지 판단
    complexName: emptyToNull(item.hsmpNm),
    statusName: emptyToNull(item.sttusNm),
    beforeAnnouncementId: emptyToNull(item.beforePblancId),
  };
}

type RawResponse = {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: { totalCount?: number; item?: MyhomeItem | MyhomeItem[] };
  };
};

/** FR-003, FR-004 (spec 001): 응답 전체 → 공고 목록. 결과 코드가 오류면 수집 오류 */
export function parseMyhomeResponse(raw: unknown): ParseResult {
  const header = (raw as RawResponse)?.response?.header;
  if (!header?.resultCode) return { ok: false, error: "마이홈 응답 형식이 다릅니다" };
  if (header.resultCode === RESULT_NO_DATA) return { ok: true, notices: [], skipped: 0, totalCount: 0 };
  if (header.resultCode !== RESULT_OK) {
    return { ok: false, error: `마이홈 응답 오류 ${header.resultCode}: ${header.resultMsg ?? ""}` };
  }
  const body = (raw as RawResponse).response?.body;
  const items = body?.item === undefined ? [] : ([] as MyhomeItem[]).concat(body.item);
  const notices = items.map(normalizeMyhomeItem).filter((n): n is Notice => n !== null);
  return {
    ok: true,
    notices,
    skipped: items.length - notices.length,
    totalCount: body?.totalCount ?? items.length,
  };
}
