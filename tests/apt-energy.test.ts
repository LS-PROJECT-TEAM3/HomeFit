import { describe, expect, it } from "vitest";
import { aptEnergyCost, aptEnergyQueryMonths, parseAptEnergy } from "@/watch/apt-energy";

// spec 018 FR-001·FR-002, 경계 E2~E4·E6. 응답 모양은 2026-11-19 실제 호출(강남구 2025-09)과 같다
const ok = (item: Record<string, number>) => ({ response: { body: { item }, header: { resultCode: "00", resultMsg: "NORMAL SERVICE." } } });

describe("aptEnergyQueryMonths (FR-002, E6)", () => {
  it("작년 같은 달, 그 전 해 같은 달(한국 시각)", () => {
    expect(aptEnergyQueryMonths(new Date("2026-11-19T03:00:00Z"))).toEqual(["202511", "202411"]);
    // 한국 1월 1일 새벽(UTC 12월 31일)
    expect(aptEnergyQueryMonths(new Date("2026-12-31T16:00:00Z"))).toEqual(["202601", "202501"]);
  });
});

describe("parseAptEnergy", () => {
  it("FR-001: 전기·난방·급탕·가스 원/㎡를 더하고 수도는 뺀다", () => {
    expect(parseAptEnergy(ok({ heat: 1681, waterHot: 327, gas: 7, elect: 907, waterCool: 181 }))).toEqual({
      perM2: 2922, parts: { elect: 907, heat: 1681, waterHot: 327, gas: 7 },
    });
  });
  it("E2: 모든 칸이 0이면 자료 없음(null)", () => {
    expect(parseAptEnergy(ok({ heat: 0, waterHot: 0, gas: 0, elect: 0, waterCool: 0 }))).toBeNull();
  });
  it("E3: 오류 코드는 코드와 함께 던진다", () => {
    expect(() => parseAptEnergy({ response: { header: { resultCode: "30", resultMsg: "SERVICE KEY IS NOT REGISTERED ERROR." } } })).toThrow("공동주택 에너지 사용 정보 오류 30");
  });
  it("E3: 모양이 다르면 던진다", () => {
    expect(() => parseAptEnergy(null)).toThrow("모양이 다름");
    expect(() => parseAptEnergy(ok({ heat: 1 } as Record<string, number>))).toThrow("모양이 다름");
  });
});

describe("aptEnergyCost (E4)", () => {
  it("원/㎡ × 전용면적, 원 단위 반올림", () => {
    expect(aptEnergyCost(2922, 84.5)).toBe(246_909);
    expect(aptEnergyCost(1050 + 84 + 136 + 4, 59.9)).toBe(76_313);
  });
});
