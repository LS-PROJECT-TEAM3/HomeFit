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
