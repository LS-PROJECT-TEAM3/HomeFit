// 가짜 한전 「가구평균 전력사용량」 응답 (spec 011 plan 2단계). 실제 응답처럼 숫자를 글자로 준다(2026-11-18 확인). 숫자는 시험용이다
export const KEPCO_HOUSE_SAMPLE = {
  data: [
    { year: "2026", month: "09", metro: "서울특별시", city: "성동구", houseCnt: "140446", powerUsage: "231.08", bill: "24202" },
  ],
};

export const KEPCO_HOUSE_EMPTY = { data: [] };

export const KEPCO_HOUSE_BAD = { result: "error", data: "잘못된 인증키" };
