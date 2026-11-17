// npm run deploy (plan 001 12단계, 사용자 요청 2026-11-17): 운영 배포 → 배포된 주소로 수집을 한 번 바로 부른다.
// 배포는 "배포해줘"라고 할 때만 쓴다(CLAUDE.md). 키 값은 출력하지 않는다.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { collectUrl, readEnvFile } from "./deploy-lib.mjs";

const VERCEL = ["--yes", "vercel@65.17.0"];
const SCOPE = "dbdpfla98s-projects";
// 운영 별칭. 배포마다 바뀌는 주소는 보호가 걸려 있어 별칭으로 부른다
const DEFAULT_PRODUCTION_URL = "https://homefit-lac.vercel.app";

const env = readEnvFile(readFileSync(".env.local", "utf-8"));
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

console.log("1) 운영 배포를 시작합니다(몇 분 걸립니다)…");
execFileSync(npx, [...VERCEL, "deploy", "--prod", "--yes", "--scope", SCOPE], { stdio: "inherit", shell: process.platform === "win32" });

const url = collectUrl({ productionUrl: env.PRODUCTION_URL || DEFAULT_PRODUCTION_URL });
if (!url || !env.CRON_SECRET) {
  console.log("2) 수집 주소나 CRON_SECRET이 없어 수집은 건너뜁니다.");
  process.exit(0);
}
console.log(`2) 배포가 끝나 수집을 한 번 부릅니다: ${url}`);
const response = await fetch(url, { headers: { authorization: `Bearer ${env.CRON_SECRET}` }, signal: AbortSignal.timeout(300_000) });
const body = await response.text();
console.log(`   응답 ${response.status}: ${body.slice(0, 300)}`);
if (!response.ok) process.exit(1);
