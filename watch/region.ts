// FR-002 (spec 001 v0.3), Q18: 공공데이터포털 법정동코드 응답 → 시도별 시군구 목록. 순수 함수
// 마이홈 공고의 시군구 코드는 지번 코드(pnu) 앞 5자리라 같은 법정동 체계다(watch/myhome.ts)

export type Sigungu = { code: string; name: string };

type Row = { sido_cd?: unknown; sgg_cd?: unknown; umd_cd?: unknown; ri_cd?: unknown; locatadd_nm?: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 응답에서 줄 목록. 자료 없음(INFO-3)은 [], 모양이 다르거나 오류면 null */
function rowsOf(raw: unknown): Row[] | null {
  if (!isRecord(raw)) return null;
  if (isRecord(raw.RESULT)) return raw.RESULT.resultCode === "INFO-3" ? [] : null;
  const parts = Array.isArray(raw.StanReginCd) ? raw.StanReginCd : null;
  const body = parts?.find((part) => isRecord(part) && Array.isArray(part.row));
  return isRecord(body) && Array.isArray(body.row) ? (body.row as Row[]) : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * 한 시도의 시군구. 시도 줄(시군구 000)과 읍면동·리 줄은 뺀다.
 * 구가 있는 시(예: 수원시 41110)는 빼고 구(41111 등)만 남긴다. 공고 코드가 구 단위라서다(spec 001 v0.3 가정).
 * 상위 코드 칸은 구도 시도를 가리켜서 쓸 수 없고, 코드 앞 4자리가 같은 다른 줄이 있는지로 판단한다.
 */
export function sigunguFromResponse(raw: unknown, sidoCode: string): Sigungu[] | null {
  const rows = rowsOf(raw);
  if (rows === null) return null;
  const level = rows.filter(
    (r) => text(r.sido_cd) === sidoCode && text(r.sgg_cd) !== "000" && text(r.sgg_cd).length === 3 && text(r.umd_cd) === "000" && (text(r.ri_cd) || "00") === "00",
  );
  const codes = level.map((r) => sidoCode + text(r.sgg_cd));
  const hasChildren = (code: string) => code.endsWith("0") && codes.some((other) => other !== code && other.slice(0, 4) === code.slice(0, 4));
  const list = level
    .map((r) => {
      const code = sidoCode + text(r.sgg_cd);
      const full = text(r.locatadd_nm).trim();
      const name = full.split(" ").slice(1).join(" ") || full;
      return { code, name };
    })
    .filter((s) => !hasChildren(s.code));
  const unique = [...new Map(list.map((s) => [s.code, s])).values()];
  return unique.sort((a, b) => a.name.localeCompare(b.name, "ko"));
}
