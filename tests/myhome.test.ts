import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeMyhomeItem, parseMyhomeResponse, sidoCodeFromName } from "@/watch/myhome";

// 2026-11-17 실제 응답에서 남긴 시험 자료 (watch/fixtures/myhome-sample.json)
const sample = JSON.parse(readFileSync("watch/fixtures/myhome-sample.json", "utf-8"));
const [busanItem, seoulItem] = sample.response.body.item;

// FR-003 (spec 001), Q6·Q17 결과
describe("normalizeMyhomeItem", () => {
  it("실제 응답 한 건을 공고 모양으로 바꾼다", () => {
    expect(normalizeMyhomeItem(busanItem)).toEqual({
      externalId: "21581-3",
      announcementId: "21581",
      title: "부산광역시 국민임대주택 예비입주자 정례모집 공고(2026.11.16.)",
      sidoCode: "26",
      sigunguCode: "26710",
      supplyType: "국민임대",
      monthlyRent: 127870,
      announcedOn: "2026-11-16",
      applyStart: "2026-11-30",
      applyEnd: "2026-12-02",
      url: "https://www.myhome.go.kr/hws/portal/sch/selectRsdtRcritNtcDetailView.do?pblancId=21581&houseSn=3",
    });
  });

  it("Q17: pnu가 없으면(시도 전체 공고) 시도는 이름으로 찾고 시군구는 비운다", () => {
    const notice = normalizeMyhomeItem(seoulItem);
    expect(notice?.sidoCode).toBe("11");
    expect(notice?.sigunguCode).toBeNull();
  });

  it("Q17: 월 임대료 0은 '정보 없음'으로 본다", () => {
    expect(normalizeMyhomeItem(seoulItem)?.monthlyRent).toBeNull();
  });

  it("공고 ID가 없으면 건너뛴다(null)", () => {
    expect(normalizeMyhomeItem({ ...busanItem, pblancId: "" })).toBeNull();
  });

  it("마감일이 비면 null이고 오류가 아니다", () => {
    expect(normalizeMyhomeItem({ ...busanItem, endDe: "" })?.applyEnd).toBeNull();
  });

  it("날짜 형식이 이상하면 그 날짜만 비운다", () => {
    expect(normalizeMyhomeItem({ ...busanItem, beginDe: "2026-1" })?.applyStart).toBeNull();
  });

  it("상세 링크가 비면 다른 링크를 쓴다", () => {
    const notice = normalizeMyhomeItem({ ...busanItem, pcUrl: "" });
    expect(notice?.url).toBe(busanItem.url);
  });
});

describe("sidoCodeFromName", () => {
  it.each([
    ["서울특별시", "11"],
    ["부산광역시", "26"],
    ["세종특별자치시", "36"],
    ["강원특별자치도", "51"],
    ["강원도", "51"],
    ["전북특별자치도", "52"],
    ["전라북도", "52"],
    ["제주특별자치도", "50"],
  ])("%s → %s", (name, code) => {
    expect(sidoCodeFromName(name)).toBe(code);
  });

  it("모르는 이름은 null", () => {
    expect(sidoCodeFromName("없는도")).toBeNull();
  });
});

describe("parseMyhomeResponse", () => {
  it("정상 응답에서 공고와 전체 건수를 꺼낸다", () => {
    const result = parseMyhomeResponse(sample);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.notices).toHaveLength(3);
    expect(result.skipped).toBe(0);
    expect(result.totalCount).toBe(3);
  });

  it("공고 ID 없는 건은 건너뛴 수로 센다", () => {
    const broken = structuredClone(sample);
    broken.response.body.item[1].pblancId = "";
    const result = parseMyhomeResponse(broken);
    expect(result.ok && result.notices.length).toBe(2);
    expect(result.ok && result.skipped).toBe(1);
  });

  it("결과 코드 03(자료 없음)은 오류가 아니라 0건이다", () => {
    const empty = { response: { header: { resultCode: "03", resultMsg: "NODATA_ERROR" }, body: {} } };
    expect(parseMyhomeResponse(empty)).toEqual({ ok: true, notices: [], skipped: 0, totalCount: 0 });
  });

  it("그 밖의 결과 코드는 수집 오류다", () => {
    const denied = { response: { header: { resultCode: "30", resultMsg: "SERVICE_KEY_IS_NOT_REGISTERED_ERROR" } } };
    expect(parseMyhomeResponse(denied)).toEqual({
      ok: false,
      error: "마이홈 응답 오류 30: SERVICE_KEY_IS_NOT_REGISTERED_ERROR",
    });
  });

  it("모양이 전혀 다르면 수집 오류다", () => {
    expect(parseMyhomeResponse("<html>")).toEqual({ ok: false, error: "마이홈 응답 형식이 다릅니다" });
  });

  it("공고가 한 건이면 배열이 아니어도 읽는다", () => {
    const single = { response: { header: { resultCode: "00" }, body: { totalCount: 1, item: busanItem } } };
    const result = parseMyhomeResponse(single);
    expect(result.ok && result.notices).toHaveLength(1);
  });
});
