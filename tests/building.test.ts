import { describe, expect, it } from "vitest";
import { parseBuildingQuery, parseBuildingTitles, umdFromResponse, yearsSinceApproval } from "@/watch/building";
import sample from "@/watch/fixtures/building-sample.json";

// spec 004 v0.4 FR-008, PRD v1.8 FR-34: 건축HUB 건축물대장 표제부 조회. 주소는 저장하지 않는다
describe("parseBuildingTitles", () => {
  it("실제 응답 저장본(서울시청)을 화면 값으로", () => {
    const [first] = parseBuildingTitles(sample);
    expect(first).toMatchObject({
      name: "서울특별시 청사", dong: "신관", purpose: "업무시설", structure: "철골철근콘크리트구조",
      approvedOn: "2012-08-31", floorsAbove: 13, floorsBelow: 5, quakeDesign: "적용", address: "서울특별시 중구 태평로1가 31번지",
    });
  });
  it("결과 코드가 00이 아니면 오류", () => {
    expect(() => parseBuildingTitles({ response: { header: { resultCode: "30", resultMsg: "SERVICE KEY IS NOT REGISTERED" } } })).toThrow(/건축HUB 응답 오류 30/);
  });
  it("결과가 없으면 빈 목록(오류 아님)", () => {
    expect(parseBuildingTitles({ response: { header: { resultCode: "00" }, body: { items: "", totalCount: 0 } } })).toEqual([]);
  });
  it("내진설계 0은 미적용, 빈 값은 정보 없음, 사용승인일이 이상하면 null", () => {
    const one = (item: Record<string, unknown>) => parseBuildingTitles({ response: { header: { resultCode: "00" }, body: { items: { item } } } })[0];
    expect(one({ rserthqkDsgnApplyYn: "0", useAprDay: "2012" }).quakeDesign).toBe("미적용");
    expect(one({ rserthqkDsgnApplyYn: " ", useAprDay: " " })).toMatchObject({ quakeDesign: "정보 없음", approvedOn: null });
  });
});

describe("parseBuildingQuery", () => {
  it("본번·부번을 네 자리로, 부번은 비우면 0000", () => {
    expect(parseBuildingQuery({ sigunguCode: "11140", bjdongCode: "10300", bun: "31", ji: "" })).toEqual({ ok: true, value: { sigunguCode: "11140", bjdongCode: "10300", bun: "0031", ji: "0000" } });
  });
  it("읍면동을 안 고르거나 번지가 숫자가 아니면 할 일을 알려 준다", () => {
    expect(parseBuildingQuery({ sigunguCode: "11140", bjdongCode: "", bun: "31", ji: "" })).toEqual({ ok: false, error: "시군구와 읍면동을 골라 주세요." });
    expect(parseBuildingQuery({ sigunguCode: "11140", bjdongCode: "10300", bun: "삼십일", ji: "" })).toEqual({ ok: false, error: "번지는 숫자로 입력해 주세요. 예: 31 (부번은 0이나 비워 두기)" });
  });
});

describe("umdFromResponse", () => {
  it("법정동 응답에서 읍면동만(리·시군구 줄 제외), 코드 뒤 다섯 자리", () => {
    const json = { StanReginCd: [{ head: [] }, { row: [
      { region_cd: "1114000000", umd_cd: "000", ri_cd: "00", locallow_nm: "중구" },
      { region_cd: "1114010300", umd_cd: "103", ri_cd: "00", locallow_nm: "태평로1가" },
      { region_cd: "4182025021", umd_cd: "250", ri_cd: "21", locallow_nm: "어느리" },
    ] }] };
    expect(umdFromResponse(json)).toEqual([{ code: "10300", name: "태평로1가" }]);
  });
});

// spec 022 FR-011(집 점검 건축물 정보 보드): "준공 후 N년 지났어요". 만 나이처럼 날짜가 지나야 한 해
describe("yearsSinceApproval", () => {
  it("사용승인일부터 오늘까지 만 년수", () => {
    expect(yearsSinceApproval("2009-06-12", "2026-11-21")).toBe(17);
    expect(yearsSinceApproval("2009-12-01", "2026-11-21")).toBe(16);
    expect(yearsSinceApproval("2026-01-01", "2026-11-21")).toBe(0);
  });
  it("날짜가 없으면 null", () => {
    expect(yearsSinceApproval(null, "2026-11-21")).toBe(null);
  });
});
