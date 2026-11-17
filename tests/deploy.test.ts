import { describe, expect, it } from "vitest";
import { collectUrl, readEnvFile } from "../scripts/deploy-lib.mjs";

// plan 001 12단계: npm run deploy가 배포 뒤 바로 수집을 부른다 (사용자 요청 2026-11-17)
describe("deploy.collectUrl", () => {
  it("운영 주소(별칭)가 정해져 있으면 그 주소의 수집 입구", () => {
    expect(collectUrl({ productionUrl: "https://homefit-lac.vercel.app/" })).toBe("https://homefit-lac.vercel.app/api/cron/myhome");
  });

  it("비어 있으면 null(수집을 부르지 않음)", () => {
    expect(collectUrl({ productionUrl: "" })).toBeNull();
    expect(collectUrl({ productionUrl: undefined })).toBeNull();
  });

  it("http(s)가 아니면 null", () => {
    expect(collectUrl({ productionUrl: "homefit-lac.vercel.app" })).toBeNull();
  });
});

describe("deploy.readEnvFile", () => {
  it("이름=값 줄만 읽고 따옴표·CR·주석을 정리한다", () => {
    expect(readEnvFile('# 주석\nCRON_SECRET="abc"\r\nAPP_BASE_URL=https://x.test\nEMPTY=\n')).toEqual({
      CRON_SECRET: "abc", APP_BASE_URL: "https://x.test", EMPTY: "",
    });
  });
});
