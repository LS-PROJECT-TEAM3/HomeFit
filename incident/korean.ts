/** 받침이 있으면 "을", 없으면 "를"을 붙인다 (예: 계획을, 메모를). 화면 문구용 순수 함수 */
export function withObject(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return `${word}${code >= 0 && code < 11172 && code % 28 !== 0 ? "을" : "를"}`;
}
