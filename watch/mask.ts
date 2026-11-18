// FR-004 (spec 001): 실행 기록·화면에 키 값이 남지 않게 가린다 (PRD FR-27)

const MASK = "***";
const MIN_SECRET_LENGTH = 4;
const SERVICE_KEY_IN_URL = /(serviceKey=)[^&\s]+/gi;
// 슬랙 봇 토큰 (spec 001 v0.3 FR-019): 목록에 없어도 모양으로 가린다
const SLACK_TOKEN = /xox[abpr]-[0-9A-Za-z-]+/g;

/**
 * @param text 오류 메시지 같은 바깥으로 보일 글
 * @param secrets 가릴 키 값들(환경변수 값). 짧거나 빈 값은 키로 보지 않는다
 */
export function maskSecrets(text: string, secrets: readonly string[]): string {
  const masked = secrets
    .filter((secret) => secret.length >= MIN_SECRET_LENGTH)
    .reduce((current, secret) => current.split(secret).join(MASK), text);
  return masked.replace(SERVICE_KEY_IN_URL, `$1${MASK}`).replace(SLACK_TOKEN, MASK);
}
