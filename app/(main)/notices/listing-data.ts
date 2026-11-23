import type { ConditionOverride } from "@/incident/notice-list";
import { fetchSigunguList } from "@/watch/region.server";
import { SIDO_OPTIONS } from "@/watch/sido";

// spec 022(v2-s3-pc·s3b-pc): 맞춤 공고 두 탭이 같이 쓰는 주소 값 읽기와 지역 이름
const OVERRIDE_KEYS = ["sido", "sgg", "types", "rent", "age", "targets"] as const;

/** 주소(?sido=…)의 잠깐 바꾼 조건. 문자열 하나인 칸만 */
export function readOverride(params: Record<string, string | string[] | undefined>): ConditionOverride {
  const override: ConditionOverride = {};
  for (const key of OVERRIDE_KEYS) {
    const value = params[key];
    if (typeof value === "string") override[key] = value;
  }
  return override;
}

export const sidoName = (code: string | null) => SIDO_OPTIONS.find((o) => o.code === code)?.name ?? "";

/** 시군구 이름은 30일 기억하는 목록에서. 못 읽으면 빈 목록(시도 이름만 보인다) */
export async function sigunguNames(sidoCode: string): Promise<Map<string, string>> {
  try {
    return new Map((await fetchSigunguList(sidoCode)).map((s) => [s.code, s.name]));
  } catch {
    return new Map();
  }
}

/** 칩 글자 "서울특별시 관악구" */
export function regionLabel(sidoCode: string, sigunguCode: string | null, names: Map<string, string>): string {
  return [sidoName(sidoCode), sigunguCode ? names.get(sigunguCode) : null].filter(Boolean).join(" ");
}
