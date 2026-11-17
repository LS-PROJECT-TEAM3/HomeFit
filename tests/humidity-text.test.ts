import { describe, expect, it } from "vitest";
import { describeRiskTime, windowTypeText } from "@/incident/humidity-text";

// FR-006 (spec 003): 사건 상세 첫 화면의 "가장 위험한 시각"과 "남은 시간"
const NOW = new Date("2026-11-18T06:00:00+09:00");

describe("describeRiskTime", () => {
  it("19시간 뒤면 시각과 남은 시간", () => {
    expect(describeRiskTime("2026-11-19T01:00:00+09:00", NOW)).toEqual({ at: "11월 19일 01시", remaining: "19시간 남음" });
  });
  it("1시간이 안 남으면 '1시간 안'", () => {
    expect(describeRiskTime("2026-11-18T06:40:00+09:00", NOW).remaining).toBe("1시간 안");
  });
  it("지났으면 '지남' (색이 아니라 글자로)", () => {
    expect(describeRiskTime("2026-11-18T05:00:00+09:00", NOW).remaining).toBe("지남");
  });
});

describe("windowTypeText", () => {
  it("모름은 홑유리로 계산했다고 밝힌다", () => {
    expect(windowTypeText("unknown")).toBe("모름(홑유리로 계산)");
    expect(windowTypeText("double")).toBe("이중유리");
  });
});
