import { describe, expect, it } from "vitest";
import { parseRtmsResponse, recentDealMonths } from "@/watch/rtms";

// spec 008 FR-002·003, 경계 E7·E8. 실제 응답 칸 이름(2026-11-18 대전 서구 2026-10 확인)으로 만든 가짜
const ok = (item: unknown, totalCount = 1) => ({ response: { header: { resultCode: "000", resultMsg: "OK" }, body: { items: { item }, totalCount, numOfRows: 1000, pageNo: 1 } } });

describe("parseRtmsResponse", () => {
  it("E8: 만원 단위 글자(쉼표)와 숫자를 모두 원으로, 월세 0은 전세", () => {
    const result = parseRtmsResponse(ok([
      { sggCd: 30170, dealYear: 2026, dealMonth: 10, deposit: "13,500", monthlyRent: 0, excluUseAr: 49 },
      { sggCd: 30170, dealYear: 2026, dealMonth: 9, deposit: 500, monthlyRent: 48, excluUseAr: 36.12 },
    ], 2), "officetel");
    expect(result).toEqual({
      ok: true, totalCount: 2, skipped: 0, trades: [
        { housingType: "officetel", sigunguCode: "30170", dealYm: "2026-10", areaM2: 49, contractType: "jeonse", deposit: 135_000_000, monthlyRent: 0 },
        { housingType: "officetel", sigunguCode: "30170", dealYm: "2026-09", areaM2: 36.12, contractType: "monthly", deposit: 5_000_000, monthlyRent: 480_000 },
      ],
    });
  });
  it("단독·다가구는 연면적(totalFloorAr)을 면적으로(사용자 결정 2026-11-18), 항목 하나는 객체로 온다", () => {
    const result = parseRtmsResponse(ok({ sggCd: 30170, dealYear: 2026, dealMonth: 10, deposit: "1,000", monthlyRent: 28, totalFloorAr: 30 }), "detached");
    expect(result.ok && result.trades[0]).toMatchObject({ areaM2: 30, contractType: "monthly", monthlyRent: 280_000 });
  });
  it("금액·면적을 읽을 수 없는 거래는 건너뛴다", () => {
    const result = parseRtmsResponse(ok([{ sggCd: 30170, dealYear: 2026, dealMonth: 10, deposit: " ", monthlyRent: 0, excluUseAr: 49 }]), "apartment");
    expect(result).toMatchObject({ ok: true, trades: [], skipped: 1 });
  });
  it("거래가 없으면 items가 빈 글자로 온다", () => {
    expect(parseRtmsResponse({ response: { header: { resultCode: "000" }, body: { items: "", totalCount: 0 } } }, "apartment")).toEqual({ ok: true, trades: [], skipped: 0, totalCount: 0 });
  });
  it("E7: 오류 코드·다른 모양은 수집 오류", () => {
    expect(parseRtmsResponse({ response: { header: { resultCode: "03", resultMsg: "NO_DATA" } } }, "apartment")).toEqual({ ok: false, error: "실거래가 응답 오류 03: NO_DATA" });
    expect(parseRtmsResponse("<OpenAPI_ServiceResponse>", "apartment")).toEqual({ ok: false, error: "실거래가 응답 형식이 다릅니다" });
  });
});

describe("recentDealMonths", () => {
  it("실행 달의 앞 3개월(해를 넘김)", () => {
    expect(recentDealMonths("2026-11-18")).toEqual(["202610", "202609", "202608"]);
    expect(recentDealMonths("2027-02-02")).toEqual(["202701", "202612", "202611"]);
  });
});
