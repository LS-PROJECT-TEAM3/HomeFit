// 법정동 시도 코드(앞 2자리)와 지금 쓰는 이름. 화면의 시도 목록과 공고 지역 비교에 같이 쓴다.
export const SIDO_OPTIONS: readonly { code: string; name: string }[] = [
  { code: "11", name: "서울특별시" },
  { code: "26", name: "부산광역시" },
  { code: "27", name: "대구광역시" },
  { code: "28", name: "인천광역시" },
  { code: "29", name: "광주광역시" },
  { code: "30", name: "대전광역시" },
  { code: "31", name: "울산광역시" },
  { code: "36", name: "세종특별자치시" },
  { code: "41", name: "경기도" },
  { code: "43", name: "충청북도" },
  { code: "44", name: "충청남도" },
  { code: "46", name: "전라남도" },
  { code: "47", name: "경상북도" },
  { code: "48", name: "경상남도" },
  { code: "50", name: "제주특별자치도" },
  { code: "51", name: "강원특별자치도" },
  { code: "52", name: "전북특별자치도" },
];

// 특별자치도로 바뀌기 전 이름도 받는다
const OLD_NAMES: Record<string, string> = { 강원도: "51", 전라북도: "52" };

/** Q17 처리: 공고에 지번 코드(pnu)가 없을 때 시도 이름으로 시도 코드를 찾는다 */
export function sidoCodeFromName(name: string): string | null {
  const trimmed = name.trim();
  return SIDO_OPTIONS.find((sido) => sido.name === trimmed)?.code ?? OLD_NAMES[trimmed] ?? null;
}

export function isKnownSidoCode(code: string): boolean {
  return SIDO_OPTIONS.some((sido) => sido.code === code);
}
