// 사용자 요청(2026-11-23): 왼쪽 "입력함 n/m"이 저장된 값으로만 세어져 입력해도 그대로였다. 폼에 지금 들어 있는 값으로 센다. 순수 함수

/** 첫 설정 단계별로 세는 칸(폼 name). 1단계 9칸, 2단계 6칸(예전 저장 값 기준 세기와 같은 칸) */
export const PROGRESS_FIELDS = {
  1: ["sigunguCode", "housingType", "exclusiveArea", "windowType", "contractType", "deposit", "monthlyRent", "maintenanceFee", "contractEndDate"],
  2: ["sidoCode", "sigunguCode", "supplyTypes", "maxMonthlyRent", "age", "targetGroups"],
} as const;

/** 폼 값 [이름, 값] 목록에서 값이 하나라도 있는 칸 수 */
export function filledCount(entries: Iterable<[string, FormDataEntryValue]>, fields: readonly string[]): number {
  const filled = new Set<string>();
  for (const [name, value] of entries) {
    if (typeof value === "string" && value.trim() !== "") filled.add(name);
  }
  return fields.filter((field) => filled.has(field)).length;
}
