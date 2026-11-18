// npm run deploy (plan 001 12단계, 사용자 요청 2026-11-17): 운영 배포 → 운영 별칭이 새 배포로 바뀐 걸 확인 → 수집을 한 번 부른다.
// 배포는 "배포해줘"라고 할 때만 쓴다(CLAUDE.md). 키 값은 출력하지 않는다.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { aliasServes, collectUrl, deployedHost, readEnvFile } from "./deploy-lib.mjs";

const VERCEL = ["--yes", "vercel@65.17.0"];
const SCOPE = "dbdpfla98s-projects";
// 운영 별칭. 배포마다 바뀌는 주소는 보호가 걸려 있어 별칭으로 부른다
const DEFAULT_PRODUCTION_URL = "https://homefit-lac.vercel.app";
const ALIAS_CHECKS = 12;
const ALIAS_WAIT_MS = 10_000;

const env = readEnvFile(readFileSync(".env.local", "utf-8"));
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const shell = process.platform === "win32";
const productionUrl = env.PRODUCTION_URL || DEFAULT_PRODUCTION_URL;

function vercel(args) {
  return execFileSync(npx, [...VERCEL, ...args, "--scope", SCOPE], { encoding: "utf-8", stdio: ["inherit", "pipe", "inherit"], shell });
}

/** 별칭이 새 배포를 가리킬 때까지 기다린다. 확인 못 하면 false */
async function waitForAlias(host) {
  for (let check = 1; check <= ALIAS_CHECKS; check += 1) {
    let inspected = "";
    try {
      inspected = vercel(["inspect", productionUrl, "--format=json"]);
    } catch {
      inspected = "";
    }
    if (aliasServes(inspected, host)) return true;
    console.log(`   운영 주소가 아직 새 배포가 아닙니다. ${ALIAS_WAIT_MS / 1000}초 뒤 다시 봅니다 (${check}/${ALIAS_CHECKS})`);
    await sleep(ALIAS_WAIT_MS);
  }
  return false;
}

console.log("1) 운영 배포를 시작합니다(몇 분 걸립니다)…");
const host = deployedHost(vercel(["deploy", "--prod", "--yes"]));
if (!host) {
  console.log("   배포 주소를 찾지 못해 수집은 건너뜁니다. Vercel 화면에서 배포 상태를 확인해 주세요.");
  process.exit(1);
}
console.log(`   새 배포: ${host}`);

const url = collectUrl({ productionUrl });
if (!url || !env.CRON_SECRET) {
  console.log("2) 수집 주소나 CRON_SECRET이 없어 수집은 건너뜁니다.");
  process.exit(0);
}
console.log("2) 운영 주소가 새 배포로 바뀌었는지 확인합니다…");
if (!(await waitForAlias(host))) {
  console.log("   2분 안에 운영 주소가 새 배포로 바뀌지 않아 수집하지 않았습니다. 옛 코드로 수집하면 옛 규칙 사건이 생깁니다. 잠시 뒤 다시 확인해 주세요.");
  process.exit(1);
}
console.log(`3) 새 배포를 확인해 수집을 한 번 부릅니다: ${url}`);
const response = await fetch(url, { headers: { authorization: `Bearer ${env.CRON_SECRET}` }, signal: AbortSignal.timeout(300_000) });
const body = await response.text();
console.log(`   응답 ${response.status}: ${body.slice(0, 300)}`);
if (!response.ok) process.exit(1);
