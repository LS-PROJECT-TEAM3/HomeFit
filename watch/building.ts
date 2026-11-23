// spec 004 v0.4 FR-008, PRD v1.8 FR-34: 건축HUB 건축물대장 표제부(getBrTitleInfo) 해석과 조회 입력 검사. 순수 함수
// 응답 모양은 2026-11-18 실제 응답으로 확인(watch/fixtures/building-sample.json). 넣은 주소는 저장하지 않는다

export type BuildingTitle = {
  name: string;
  dong: string;
  purpose: string;
  structure: string;
  approvedOn: string | null;
  floorsAbove: number | null;
  floorsBelow: number | null;
  households: number | null;
  totalArea: number | null;
  quakeDesign: "적용" | "미적용" | "정보 없음";
  address: string;
  roadAddress: string;
};

type Raw = Record<string, unknown>;

function isRecord(value: unknown): value is Raw {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function num(value: unknown): number | null {
  const t = text(value);
  return t === "" || Number.isNaN(Number(t)) ? null : Number(t);
}

/** "20120831" → "2012-08-31". 모양이 다르면 null */
function ymd(value: unknown): string | null {
  const t = text(value);
  return /^\d{8}$/.test(t) ? `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}` : null;
}

function quake(value: unknown): BuildingTitle["quakeDesign"] {
  const t = text(value);
  if (t === "1") return "적용";
  if (t === "0") return "미적용";
  return "정보 없음";
}

/** 결과 코드 오류는 던진다(조회 실패). 결과가 없으면 빈 목록 */
export function parseBuildingTitles(json: unknown): BuildingTitle[] {
  const response = isRecord(json) ? json.response : undefined;
  if (!isRecord(response) || !isRecord(response.header)) throw new Error("건축HUB 응답 모양이 다릅니다");
  const code = text(response.header.resultCode);
  if (code !== "00") throw new Error(`건축HUB 응답 오류 ${code}: ${text(response.header.resultMsg)}`);
  const items = isRecord(response.body) && isRecord(response.body.items) ? response.body.items.item : undefined;
  const list = Array.isArray(items) ? items : isRecord(items) ? [items] : [];
  return list.filter(isRecord).map((item) => ({
    name: text(item.bldNm) || "건물명 없음",
    dong: text(item.dongNm),
    purpose: text(item.mainPurpsCdNm) || "정보 없음",
    structure: text(item.strctCdNm) || "정보 없음",
    approvedOn: ymd(item.useAprDay),
    floorsAbove: num(item.grndFlrCnt),
    floorsBelow: num(item.ugrndFlrCnt),
    households: num(item.hhldCnt),
    totalArea: num(item.totArea),
    quakeDesign: quake(item.rserthqkDsgnApplyYn),
    address: text(item.platPlc),
    roadAddress: text(item.newPlatPlc),
  }));
}

export type BuildingQuery = { sigunguCode: string; bjdongCode: string; bun: string; ji: string };

/** 본번·부번은 네 자리로 채운다(건축HUB 형식). 부번을 비우면 0000 */
export function parseBuildingQuery(input: BuildingQuery): { ok: true; value: BuildingQuery } | { ok: false; error: string } {
  if (!/^\d{5}$/.test(input.sigunguCode) || !/^\d{5}$/.test(input.bjdongCode)) return { ok: false, error: "시군구와 읍면동을 골라 주세요." };
  const bun = input.bun.trim();
  const ji = input.ji.trim() === "" ? "0" : input.ji.trim();
  if (!/^\d{1,4}$/.test(bun) || !/^\d{1,4}$/.test(ji)) return { ok: false, error: "번지는 숫자로 입력해 주세요. 예: 31 (부번은 0이나 비워 두기)" };
  return { ok: true, value: { sigunguCode: input.sigunguCode, bjdongCode: input.bjdongCode, bun: bun.padStart(4, "0"), ji: ji.padStart(4, "0") } };
}

/** 법정동코드 API 응답 → 읍면동 목록(리·시군구 줄 제외). 코드는 법정동코드 뒤 다섯 자리(건축HUB bjdongCd) */
export function umdFromResponse(json: unknown): { code: string; name: string }[] {
  const root = isRecord(json) && Array.isArray(json.StanReginCd) ? json.StanReginCd : [];
  const rows = root.flatMap((part) => (isRecord(part) && Array.isArray(part.row) ? part.row : []));
  return rows
    .filter(isRecord)
    .filter((row) => text(row.umd_cd) !== "000" && text(row.ri_cd) === "00" && /^\d{10}$/.test(text(row.region_cd)))
    .map((row) => ({ code: text(row.region_cd).slice(5), name: text(row.locallow_nm) }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

/** spec 022 FR-011: 사용승인일부터 오늘까지 만 년수("준공 후 17년 지났어요"). 날짜가 없으면 null */
export function yearsSinceApproval(approvedOn: string | null, today: string): number | null {
  if (!approvedOn) return null;
  const years = Number(today.slice(0, 4)) - Number(approvedOn.slice(0, 4));
  return today.slice(5) < approvedOn.slice(5) ? years - 1 : years;
}
