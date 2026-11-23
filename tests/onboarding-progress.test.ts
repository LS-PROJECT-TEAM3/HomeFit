import { describe, expect, it } from "vitest";
import { filledCount, PROGRESS_FIELDS } from "@/app/(setup)/onboarding/progress";

// 사용자 요청(2026-11-23): 첫 설정 왼쪽 "입력함 n/m"을 폼의 지금 값으로 센다
describe("filledCount (첫 설정 입력함 세기)", () => {
  it("값이 있는 칸만, 같은 이름이 여러 개여도 한 번만 센다", () => {
    const entries: [string, string][] = [["sigunguCode", "11680"], ["housingType", ""], ["exclusiveArea", " "], ["windowType", "unknown"], ["areaUnit", "m2"]];
    expect(filledCount(entries, PROGRESS_FIELDS[1])).toBe(2);
    expect(filledCount([["supplyTypes", "국민임대"], ["supplyTypes", "행복주택"], ["age", "27"]], PROGRESS_FIELDS[2])).toBe(2);
  });
});
