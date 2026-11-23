import { describe, expect, it } from "vitest";
import { GAS_TARIFF, gasBill, type GasRegion } from "@/incident/gas-bill";
import { GAS_SHARES, monthlyShares, parseGasFields, sidoOfSigungu, tariffRegionsFor, yearlyGas } from "@/incident/gas-year";

// spec 025 FR-001~005, E1~E5 (qa C-2501~2505)
const gyeonggi = GAS_TARIFF.regions.find((r) => r.name === "경기도") as GasRegion;
const SIDOS = ["서울", "인천", "경기", "부산", "대구", "광주", "대전", "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe("GAS_SHARES (가스공사 월별 시도별 판매현황 2022~2024 평균, C-2501)", () => {
  it("전국과 17개 시도 모두 12개월, 합 1", () => {
    expect(GAS_SHARES.national).toHaveLength(12);
    expect(Object.keys(GAS_SHARES.sido).sort()).toEqual([...SIDOS].sort());
    for (const values of [GAS_SHARES.national, ...Object.values(GAS_SHARES.sido)]) {
      expect(values).toHaveLength(12);
      expect(Math.abs(sum(values) - 1)).toBeLessThan(0.001);
    }
  });
  it("원본 CSV에서 다시 계산한 값과 같다(전국 1월 0.1493, 경기 1월 0.1569)과 출처", () => {
    expect(GAS_SHARES.national[0]).toBe(0.1493);
    expect(GAS_SHARES.sido["경기"][0]).toBe(0.1569);
    expect(GAS_SHARES.source.years).toEqual([2022, 2023, 2024]);
    expect(GAS_SHARES.source.note).toContain("가정용만이 아님");
  });
});

describe("sidoOfSigungu·tariffRegionsFor (C-2502)", () => {
  it("시군구 코드 앞 2자리로 시도, 강원·전북은 옛 코드와 새 코드 모두", () => {
    expect(sidoOfSigungu("11680")).toBe("서울");
    expect(sidoOfSigungu("41220")).toBe("경기");
    expect(sidoOfSigungu("42110")).toBe("강원");
    expect(sidoOfSigungu("51110")).toBe("강원");
    expect(sidoOfSigungu("45111")).toBe("전북");
    expect(sidoOfSigungu("52111")).toBe("전북");
    expect(sidoOfSigungu("50110")).toBe("제주");
    expect(sidoOfSigungu("99999")).toBeNull();
  });
  it("시도에 요금 지역이 하나면 그것만, 도는 여러 곳(모두 요금표에 있음)", () => {
    expect(tariffRegionsFor("경기")).toEqual(["경기도"]);
    expect(tariffRegionsFor("세종")).toEqual(["세종시"]);
    expect(tariffRegionsFor("강원")).toEqual(["강원 춘천시", "강원 원주시", "강원 영동지역", "평창"]);
    expect(tariffRegionsFor(null)).toEqual([]);
    const names = new Set(GAS_TARIFF.regions.map((r) => r.name));
    const all = SIDOS.flatMap((sido) => tariffRegionsFor(sido));
    expect(all.every((name) => names.has(name))).toBe(true);
    // 요금표 32곳이 겹치지 않고 모두 어느 시도에 들어간다
    expect(all).toHaveLength(GAS_TARIFF.regions.length);
    expect(new Set(all).size).toBe(GAS_TARIFF.regions.length);
  });
});

describe("monthlyShares (E3)", () => {
  it("시도 값이 있으면 그것, 없거나 0이 있으면 전국과 표시", () => {
    expect(monthlyShares("경기")).toEqual({ shares: GAS_SHARES.sido["경기"], national: false });
    expect(monthlyShares(null)).toEqual({ shares: GAS_SHARES.national, national: true });
    const broken = { ...GAS_SHARES, sido: { ...GAS_SHARES.sido, 세종: [0, ...GAS_SHARES.sido["세종"].slice(1)] } };
    expect(monthlyShares("세종", broken)).toEqual({ shares: GAS_SHARES.national, national: true });
  });
});

describe("yearlyGas (FR-002·FR-003, C-2503·C-2504)", () => {
  const shares = GAS_SHARES.sido["경기"];
  const year = yearlyGas({ mj: 2800, month: 1, region: gyeonggi, shares });
  it("넣은 달은 넣은 값 그대로, 계산기와 같은 요금(SC-001)", () => {
    expect(year.months[0].mj).toBe(2800);
    expect(year.months[0].bill).toEqual(gasBill(gyeonggi, 2800));
    expect(year.months[0].bill.totalWithVat).toBe(71053);
  });
  it("한 해 사용량 = 넣은 값 ÷ 그 달 비율, 손 계산: 경기 1월 2,800MJ → 8월 약 835.2MJ·22,158원", () => {
    expect(year.annualMj).toBeCloseTo(2800 / 0.1569, 6);
    expect(year.months[7].mj).toBeCloseTo(835.18, 2);
    expect(year.months[7].bill.totalWithVat).toBe(22158);
  });
  it("E4: 합계는 달마다 반올림한 요금의 합, 12개월", () => {
    expect(year.months).toHaveLength(12);
    expect(year.months.map((m) => m.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(year.totalWithVat).toBe(sum(year.months.map((m) => m.bill.totalWithVat)));
    expect(year.totalWithVat).toBe(460588);
  });
  it("가장 많은 달을 알려 준다", () => {
    expect(year.peakMonth).toBe(1);
  });
  it("E5: 기본요금을 읽지 못한 지역이면 표시", () => {
    const noBasic = { ...gyeonggi, basicFee: null };
    expect(yearlyGas({ mj: 2800, month: 1, region: noBasic, shares }).basicFeeMissing).toBe(true);
    expect(year.basicFeeMissing).toBe(false);
  });
});

describe("parseGasFields (내 집 입력, E1·E2·FR-005, C-2505)", () => {
  const ok = (usage: string, month: string, region = "") => parseGasFields({ usage, month, region }, "경기");
  it("정상: 쉼표 허용, 시도에 지역이 하나면 지역은 비움(보내도 무시)", () => {
    expect(ok("2,800", "1", "강원 춘천시")).toEqual({ ok: true, value: { mj: 2800, month: 1, region: null } });
  });
  it("E2: 둘 다 비우면 지우기(null), 하나만 넣으면 빠진 쪽 문구", () => {
    expect(ok(" ", "")).toEqual({ ok: true, value: null });
    expect(ok("2800", "")).toEqual({ ok: false, errors: { gasMonth: "몇 월 고지서인지 골라 주세요." } });
    expect(ok("", "3")).toEqual({ ok: false, errors: { gasUsage: "고지서의 도시가스 사용량(MJ)을 입력해 주세요." } });
  });
  it("E1: 숫자 아님·0·소수·100,001MJ, 달 0·13은 거절", () => {
    const usageError = { gasUsage: "사용량은 1~100,000MJ 사이 정수로 입력해 주세요. 고지서의 사용량(MJ) 칸 숫자예요." };
    for (const bad of ["abc", "0", "12.5", "100001", "-3"]) expect(ok(bad, "1")).toEqual({ ok: false, errors: usageError });
    for (const bad of ["0", "13", "x"]) expect(ok("2800", bad)).toEqual({ ok: false, errors: { gasMonth: "몇 월 고지서인지 골라 주세요." } });
    expect(ok("100000", "12")).toEqual({ ok: true, value: { mj: 100000, month: 12, region: null } });
  });
  it("FR-005: 도는 요금 지역이 필요하고 목록에 있어야 한다", () => {
    expect(parseGasFields({ usage: "2800", month: "1", region: "" }, "강원")).toEqual({ ok: false, errors: { gasRegion: "도시가스 요금 지역을 골라 주세요. 고지서의 공급사를 보면 알 수 있어요." } });
    expect(parseGasFields({ usage: "2800", month: "1", region: "경기도" }, "강원")).toEqual({ ok: false, errors: { gasRegion: "도시가스 요금 지역을 골라 주세요. 고지서의 공급사를 보면 알 수 있어요." } });
    expect(parseGasFields({ usage: "2800", month: "1", region: "강원 원주시" }, "강원")).toEqual({ ok: true, value: { mj: 2800, month: 1, region: "강원 원주시" } });
  });
});
