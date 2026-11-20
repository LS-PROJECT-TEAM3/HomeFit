import { describe, expect, it } from "vitest";
import { aliasServes, collectUrl, deployedHost, readEnvFile } from "../scripts/deploy-lib.mjs";

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

// 2026-11-17 배포 뒤 첫 수집이 옛 배포에 걸린 일: 운영 별칭이 새 배포로 바뀐 걸 확인한 뒤에만 수집한다
describe("deploy.deployedHost", () => {
  it("vercel deploy 출력에서 마지막 배포 주소의 호스트를 꺼낸다", () => {
    const out = "Vercel CLI 65.17.0\nhttps://homefit-abc123-team.vercel.app\n";
    expect(deployedHost(out)).toBe("homefit-abc123-team.vercel.app");
  });

  it("주소가 없으면 null", () => {
    expect(deployedHost("Error: build failed")).toBeNull();
  });

  // 2026-11-20 배포: CLI가 끝에 "Aliased 운영 주소"를 찍어 운영 주소를 새 배포로 잘못 읽고 2분을 헛돌았다
  it("운영 별칭 주소는 새 배포 주소로 고르지 않는다", () => {
    const out = "Production: https://homefit-2zbvgtwql-team.vercel.app [40s]\nAliased https://homefit-lac.vercel.app [40s]\n";
    expect(deployedHost(out, "https://homefit-lac.vercel.app")).toBe("homefit-2zbvgtwql-team.vercel.app");
  });

  it("운영 별칭 주소만 있으면 null", () => {
    expect(deployedHost("Aliased https://homefit-lac.vercel.app\n", "https://homefit-lac.vercel.app/")).toBeNull();
  });
});

describe("deploy.aliasServes", () => {
  it("별칭 inspect 결과의 url이 새 배포 호스트와 같으면 true", () => {
    expect(aliasServes('{"url":"homefit-abc123-team.vercel.app","readyState":"READY"}', "homefit-abc123-team.vercel.app")).toBe(true);
  });

  it("아직 옛 배포를 가리키면 false", () => {
    expect(aliasServes('{"url":"homefit-old999-team.vercel.app","readyState":"READY"}', "homefit-abc123-team.vercel.app")).toBe(false);
  });

  it("JSON이 아니거나 비어 있으면 false(수집하지 않음)", () => {
    expect(aliasServes("Error: not found", "homefit-abc123-team.vercel.app")).toBe(false);
    expect(aliasServes("", "homefit-abc123-team.vercel.app")).toBe(false);
  });
});
