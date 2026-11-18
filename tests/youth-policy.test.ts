import { describe, expect, it } from "vitest";
import { normalizeYouthPolicy, parseApplyPeriod, parseYouthPolicyResponse } from "@/watch/youth-policy";

// spec 006 FR-001·002, 경계 E1·E2·E3·E4·E6·E7. 실제 응답 칸 이름(2026-11-18 확인)으로 만든 가짜 한 건
const item = {
  plcyNo: "P-001", plcyNm: "청년 월세 지원", lclsfNm: "주거", mclsfNm: "전월세 및 주거급여 지원",
  plcySprtCn: "월 20만 원, 12개월", plcyExplnCn: "청년 월세를 지원합니다.", operInstCdNm: "가짜시",
  aplyPrdSeCd: "0057001", aplyYmd: "20261101 ~ 20261130", aplyUrlAddr: "https://example.test/apply", refUrlAddr1: "https://example.test/ref",
  sprtTrgtMinAge: "19", sprtTrgtMaxAge: "39", zipCd: "41390", frstRegDt: "2026-11-01 09:00:00",
};

describe("parseApplyPeriod", () => {
  it("한 기간을 읽는다", () => {
    expect(parseApplyPeriod("20261101 ~ 20261130")).toEqual({ start: "2026-11-01", end: "2026-11-30" });
  });
  it("E2: 두 기간이면 가장 이른 시작과 가장 늦은 끝", () => {
    expect(parseApplyPeriod("20260101 ~ 20261231\\N20270101 ~ 20271231")).toEqual({ start: "2026-01-01", end: "2027-12-31" });
  });
  it("E1: 비었거나 모양이 다르면 기간 없음", () => {
    expect(parseApplyPeriod("")).toEqual({ start: null, end: null });
    expect(parseApplyPeriod("연중")).toEqual({ start: null, end: null });
  });
});

describe("normalizeYouthPolicy", () => {
  it("정책 한 건을 공고와 같은 모양으로 바꾸고 나이·지역은 따로 둔다", () => {
    const policy = normalizeYouthPolicy(item);
    expect(policy).toMatchObject({
      externalId: "P-001", announcementId: "P-001", title: "청년 월세 지원", supplyType: "전월세 및 주거급여 지원",
      sidoCode: "41", sigunguCode: "41390", applyStart: "2026-11-01", applyEnd: "2026-11-30", announcedOn: "2026-11-01",
      url: "https://example.test/apply", minAge: 19, maxAge: 39, regionCodes: ["41390"], agency: "가짜시",
      periodKind: "period", support: "월 20만 원, 12개월",
    });
  });
  it("E3: 나이 0~0이면 나이 없음", () => {
    expect(normalizeYouthPolicy({ ...item, sprtTrgtMinAge: "0", sprtTrgtMaxAge: "0" })).toMatchObject({ minAge: null, maxAge: null });
  });
  it("E4: 지역 목록이 비면 전국(지역 없음), 여러 시도면 시도도 비운다", () => {
    expect(normalizeYouthPolicy({ ...item, zipCd: "" })).toMatchObject({ regionCodes: [], sidoCode: null, sigunguCode: null });
    expect(normalizeYouthPolicy({ ...item, zipCd: "11110,41390" })).toMatchObject({ regionCodes: ["11110", "41390"], sidoCode: null, sigunguCode: null });
  });
  it("E1: 상시(0057002)·그 밖(0057003)은 기간 없음, 신청 주소가 없으면 참고 주소", () => {
    expect(normalizeYouthPolicy({ ...item, aplyPrdSeCd: "0057002", aplyYmd: "", aplyUrlAddr: "" })).toMatchObject({ periodKind: "always", applyEnd: null, url: "https://example.test/ref" });
    expect(normalizeYouthPolicy({ ...item, aplyPrdSeCd: "0057003", aplyYmd: "" })).toMatchObject({ periodKind: "unknown" });
  });
  it("정책 ID가 없으면 건너뛴다", () => {
    expect(normalizeYouthPolicy({ ...item, plcyNo: " " })).toBeNull();
  });
});

describe("parseYouthPolicyResponse", () => {
  const ok = (list: unknown[], totCount = list.length) => ({ resultCode: 200, resultMessage: "성공", result: { pagging: { totCount, pageNum: 1, pageSize: 100 }, youthPolicyList: list } });
  it("정상 응답을 정책 목록으로", () => {
    const result = parseYouthPolicyResponse(ok([item, { ...item, plcyNo: "" }], 7));
    expect(result).toMatchObject({ ok: true, totalCount: 7, skipped: 1 });
    expect(result.ok && result.policies.map((p) => p.externalId)).toEqual(["P-001"]);
  });
  it("E6: 오류 코드·다른 모양은 수집 오류", () => {
    expect(parseYouthPolicyResponse({ errorCode: "e001", errorMsg: "invalid api key." })).toEqual({ ok: false, error: "온통청년 응답 오류 e001: invalid api key." });
    expect(parseYouthPolicyResponse({ resultCode: 500, resultMessage: "실패" })).toEqual({ ok: false, error: "온통청년 응답 오류 500: 실패" });
    expect(parseYouthPolicyResponse("<html>")).toEqual({ ok: false, error: "온통청년 응답 형식이 다릅니다" });
  });
});
