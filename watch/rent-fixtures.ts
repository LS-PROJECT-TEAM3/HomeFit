import type { AreaTarget, HomeTarget } from "@/incident/rent-detect";
import type { RtmsFetcher } from "@/watch/rtms.server";

// spec 008 FR-007 (PRD FR-24): 시뮬레이터 가짜 거래 묶음. 대상(가상 계정의 집·관심 지역)에 맞춘 거래를 만든다. 순수 함수
export const RENT_FIXTURES = {
  rise: "오름: 대상마다 같은 조건 거래 6건, 월세·보증금이 기준보다 20% 높음 → 알림",
  few: "적음: 같은 조건 거래 3건뿐 → 거래 부족, 알림 없음",
  failure: "실패: API가 오류 코드를 돌려줌 → 수집 오류로 기록",
} as const;
export type RentFixtureName = keyof typeof RENT_FIXTURES;
/** 가짜 묶음이 아니라 실제 API 거래를 가상 계정 대상에만 쓰는 시연 (시뮬레이터 목록 맨 뒤) */
export const RENT_LIVE = "live";
export const RENT_LIVE_HELP = "실제: 국토부 API의 진짜 거래로 가상 계정의 집·관심 지역만 비교";

export function isRentFixtureName(name: string): name is RentFixtureName {
  return Object.hasOwn(RENT_FIXTURES, name);
}

// 관심 지역에 지난번 값이 없으면 이 값을 기준으로 삼는다(가짜 값)
const DEFAULT_RENT = 500_000;
const DEFAULT_DEPOSIT = 10_000_000;

type Item = Record<string, number | string>;

function itemsFor(target: { sigunguCode: string; housingType: string; areaM2: number; rent: number; deposit: number }, ym: string, count: number): Item[] {
  const area: Item = target.housingType === "detached" ? { totalFloorAr: target.areaM2 } : { excluUseAr: target.areaM2 };
  return Array.from({ length: count }, (_, i) => ({
    sggCd: target.sigunguCode, dealYear: Number(ym.slice(0, 4)), dealMonth: Number(ym.slice(4, 6)), dealDay: i + 1,
    deposit: Math.round((target.deposit * 1.2) / 10_000), monthlyRent: Math.round((target.rent * 1.2) / 10_000), ...area,
  }));
}

/** 가짜 묶음 → 실제 API와 같은 응답 모양. 거래는 비교 기간의 첫 달에만 넣는다 */
export function buildRentFixture(name: RentFixtureName, targets: { homes: readonly HomeTarget[]; areas: readonly AreaTarget[] }, firstMonth: string): RtmsFetcher {
  const list = [
    ...targets.homes.filter((h) => h.contractType).map((h) => ({ ...h, rent: h.monthlyRent ?? 0, deposit: h.deposit ?? DEFAULT_DEPOSIT })),
    ...targets.areas.map((a) => ({ ...a, rent: a.lastMedianRent ?? DEFAULT_RENT, deposit: a.lastMedianDeposit ?? DEFAULT_DEPOSIT })),
  ];
  return async ({ housingType, sigunguCode, dealYmd, pageNo }) => {
    if (name === "failure") return { response: { header: { resultCode: "99", resultMsg: "SIMULATED_FAILURE" } } };
    const count = name === "rise" ? 6 : 3;
    const items = dealYmd !== firstMonth || pageNo > 1 ? [] : list
      .filter((t) => t.sigunguCode === sigunguCode && t.housingType === housingType)
      .flatMap((t) => itemsFor(t, dealYmd, count));
    return { response: { header: { resultCode: "000", resultMsg: "OK" }, body: { items: items.length ? { item: items } : "", totalCount: items.length } } };
  };
}
