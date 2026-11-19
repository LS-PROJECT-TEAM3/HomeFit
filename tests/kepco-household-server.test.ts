import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchMonth } from "@/watch/kepco-household.server";
import { KEPCO_HOUSE_SAMPLE } from "@/watch/fixtures/kepco-house";

// spec 011 FR-001, 코드 점검 2: 실제 한전을 부르지 않고 가짜 응답으로 분기만 본다
const region = { metroCd: "11", cityCd: "680" };
const period = { year: "2026", month: "09" };
const respond = (status: number, body: string) => vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status })));

describe("fetchMonth (한전 한 달치)", () => {
  beforeEach(() => vi.stubEnv("KEPCO_API_KEY", "test-key"));
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("200이면 평균을 읽는다", async () => {
    respond(200, JSON.stringify(KEPCO_HOUSE_SAMPLE));
    expect((await fetchMonth(region, period))?.kwh).toBe(231.08);
  });
  it("통계가 없는 달은 404 → 없음(null). 오류로 던지지 않아 전 달을 볼 수 있다", async () => {
    respond(404, JSON.stringify({ errCd: "404", errMsg: "NotFound" }));
    await expect(fetchMonth(region, period)).resolves.toBeNull();
  });
  it("그 밖의 오류 코드는 던지고, 오류 문구에 키를 넣지 않는다", async () => {
    respond(500, "server error");
    const error = await fetchMonth(region, period).catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("500");
    expect((error as Error).message).not.toContain("test-key");
  });
  it("200이어도 모양이 다르면 던진다(통계 없음으로 기억하지 않음, PR #15 리뷰)", async () => {
    respond(200, JSON.stringify({ result: "error", data: "잘못된 인증키" }));
    await expect(fetchMonth(region, period)).rejects.toThrow("모양이 다름");
  });
  it("200이어도 JSON이 아니면 던진다", async () => {
    respond(200, "<html>점검 중</html>");
    await expect(fetchMonth(region, period)).rejects.toThrow("JSON이 아님");
  });
  it("키가 없으면 부르지 않고 던진다", async () => {
    vi.stubEnv("KEPCO_API_KEY", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(fetchMonth(region, period)).rejects.toThrow("KEPCO_API_KEY");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
