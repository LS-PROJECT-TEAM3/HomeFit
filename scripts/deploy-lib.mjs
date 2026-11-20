// plan 001 12단계: npm run deploy의 판단 부분(순수 함수). 실행은 scripts/deploy.mjs

/**
 * .env 파일 글 → { 이름: 값 }. 주석·빈 줄은 건너뛰고 따옴표와 CR을 지운다.
 * @param {string} text
 * @returns {Record<string, string>}
 */
export function readEnvFile(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) env[match[1]] = match[2].replace(/^"(.*)"$/, "$1");
  }
  return env;
}

/**
 * 배포 뒤 부를 수집 입구 주소. 운영 주소가 없거나 이상하면 null(수집을 부르지 않음).
 * @param {{ productionUrl: string | undefined }} input
 * @returns {string | null}
 */
export function collectUrl({ productionUrl }) {
  const base = (productionUrl ?? "").trim().replace(/\/+$/, "");
  if (!/^https?:\/\/[^/\s]+/.test(base)) return null;
  return `${base}/api/cron/myhome`;
}

/**
 * vercel deploy 출력 → 새 배포 주소의 호스트. 출력에 주소가 없으면 null.
 * CLI가 끝에 "Aliased 운영 주소"를 찍으므로 운영 별칭은 뺀다(2026-11-20 배포에서 2분 헛돎).
 * @param {string} output
 * @param {string} [productionUrl]
 * @returns {string | null}
 */
export function deployedHost(output, productionUrl = "") {
  const aliasHost = productionUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase();
  const hosts = [...output.matchAll(/https:\/\/([a-z0-9-]+\.vercel\.app)/gi)].map((m) => m[1]).filter((host) => host.toLowerCase() !== aliasHost);
  return hosts.at(-1) ?? null;
}

/**
 * 운영 별칭을 vercel inspect --format=json 한 결과가 새 배포를 가리키는가.
 * 첫 배포 뒤 수집이 옛 배포에 걸린 일(2026-11-17) 때문에, 확인되지 않으면 false로 두고 수집하지 않는다.
 * @param {string} inspectJson
 * @param {string} host
 * @returns {boolean}
 */
export function aliasServes(inspectJson, host) {
  try {
    return JSON.parse(inspectJson)?.url === host;
  } catch {
    return false;
  }
}
