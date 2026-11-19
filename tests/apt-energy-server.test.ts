import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAptMonth } from "@/watch/apt-energy.server";

// spec 018 E3: 실제 API를 부르지 않고 가짜 응답으로 분기만 본다
const respond = (status: number, body: string) => vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status })));
const item = { heat: 84, waterHot: 136, gas: 4, elect: 1050, waterCool: 192 };

describe("fetchAptMonth (아파트 시군구 평균 한 달)", () => {
  beforeEach(() => vi.stubEnv("DATA_GO_KR_SERVICE_KEY", "test-key"));
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("200이면 원/㎡ 합을 읽는다", async () => {
    respond(200, JSON.stringify({ response: { body: { item }, header: { resultCode: "00" } } }));
    expect((await fetchAptMonth("11680", "202509"))?.perM2).toBe(1274);
  });
  it("HTTP 오류는 던지고 오류 문구에 키를 넣지 않는다", async () => {
    respond(500, "error");
    const error = await fetchAptMonth("11680", "202509").catch((e: Error) => e);
    expect((error as Error).message).toContain("500");
    expect((error as Error).message).not.toContain("test-key");
  });
  it("JSON이 아니면 던진다", async () => {
    respond(200, "<OpenAPI_ServiceResponse>SERVICE ERROR</OpenAPI_ServiceResponse>");
    await expect(fetchAptMonth("11680", "202509")).rejects.toThrow("JSON이 아님");
  });
  it("키가 없으면 부르지 않고 던진다", async () => {
    vi.stubEnv("DATA_GO_KR_SERVICE_KEY", "");
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    await expect(fetchAptMonth("11680", "202509")).rejects.toThrow("DATA_GO_KR_SERVICE_KEY");
    expect(spy).not.toHaveBeenCalled();
  });
});
