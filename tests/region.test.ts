import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sigunguFromResponse } from "@/watch/region";

// 2026-11-17 법정동코드 API 실제 응답(대전·경기·세종, 시군구 줄만) (watch/fixtures/region-sample.json)
const sample = JSON.parse(readFileSync("watch/fixtures/region-sample.json", "utf-8"));

// FR-002 (spec 001 v0.3): 시도별 시군구 목록, Q18
describe("sigunguFromResponse", () => {
  it("대전은 구 5개", () => {
    const list = sigunguFromResponse(sample, "30");
    expect(list).toEqual([
      { code: "30230", name: "대덕구" },
      { code: "30110", name: "동구" },
      { code: "30170", name: "서구" },
      { code: "30200", name: "유성구" },
      { code: "30140", name: "중구" },
    ]);
  });

  it("구가 있는 시는 구만(수원시 없이 수원시 ○○구)", () => {
    const names = sigunguFromResponse(sample, "41")!.map((s) => s.name);
    expect(names).toEqual(expect.arrayContaining(["수원시 장안구", "수원시 권선구", "수원시 팔달구", "수원시 영통구"]));
    expect(names).not.toContain("수원시");
    expect(names).not.toContain("경기도");
  });

  it("다른 시도의 시군구는 섞이지 않는다", () => {
    expect(sigunguFromResponse(sample, "30")!.every((s) => s.code.startsWith("30"))).toBe(true);
  });

  it("세종처럼 시도와 이름이 같으면 전체 이름", () => {
    expect(sigunguFromResponse(sample, "36")).toEqual([{ code: "36110", name: "세종특별자치시" }]);
  });

  it("자료 없음(INFO-3)은 빈 목록, 모양이 다르면 null(불러오기 실패)", () => {
    expect(sigunguFromResponse({ RESULT: { resultCode: "INFO-3", resultMsg: "데이터없음 에러" } }, "99")).toEqual([]);
    expect(sigunguFromResponse({ RESULT: { resultCode: "INFO-200" } }, "30")).toBeNull();
    expect(sigunguFromResponse("이상한 값", "30")).toBeNull();
  });
});
