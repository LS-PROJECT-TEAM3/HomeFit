// spec 010 FR-001 (PRD FR-25): 시세 변화 채점 정답 묶음. 모두 가짜 거래다(실제 거래·개인 정보 아님)
// 정답은 spec 008 규칙(같은 조건 5건 이상, 10% 이상, 면적 ±20%)과 spec 010 경계 상황 E1~E7에서 가져왔다. 감지 코드에서 정답을 만들지 않는다
import type { AreaTarget, HomeTarget } from "@/incident/rent-detect";
import type { Trade } from "@/watch/rtms";

export type RentCase = {
  kind: "rent";
  id: string;
  title: string;
  basis: string;
  expected: boolean;
  homes: HomeTarget[];
  areas: AreaTarget[];
  trades: Trade[];
};

const SIGUNGU = "41390";

/** 내 집: 시흥 오피스텔 20㎡, 월세 50만 원, 보증금 1,000만 원 */
const HOME: HomeTarget = {
  homeId: "eval-home", userId: "eval-user", sigunguCode: SIGUNGU, housingType: "officetel", areaM2: 20,
  contractType: "monthly", deposit: 10_000_000, monthlyRent: 500_000, contractEndDate: "2027-06-30",
};

/** 관심 지역: 같은 조건, 지난 중앙값 월세 50만 원·보증금 1,000만 원 */
const AREA: AreaTarget = {
  areaId: "eval-area", userId: "eval-user", sigunguCode: SIGUNGU, housingType: "officetel", areaM2: 20,
  contractType: "monthly", lastMedianRent: 500_000, lastMedianDeposit: 10_000_000,
};

function trades(count: number, over: Partial<Trade>): Trade[] {
  const base: Trade = { housingType: "officetel", sigunguCode: SIGUNGU, dealYm: "2026-10", areaM2: 20, contractType: "monthly", deposit: 10_000_000, monthlyRent: 500_000 };
  return Array.from({ length: count }, () => ({ ...base, ...over }));
}

const home = (over: Omit<RentCase, "kind" | "homes" | "areas">): RentCase => ({ kind: "rent", homes: [HOME], areas: [], ...over });
const area = (over: Omit<RentCase, "kind" | "homes" | "areas">, target: AreaTarget = AREA): RentCase => ({ kind: "rent", homes: [], areas: [target], ...over });

export const RENT_CASES: RentCase[] = [
  home({ id: "R-01", title: "내 집 주변 월세 중앙값이 계약보다 정확히 10% 높음(거래 5건)", basis: "사건 기준: 10% 이상 변화 (E2)", expected: true,
    trades: trades(5, { monthlyRent: 550_000 }) }),
  home({ id: "R-02", title: "월세 중앙값이 계약보다 9% 높음", basis: "사건 아님: 10% 미만 (E2)", expected: false,
    trades: trades(5, { monthlyRent: 545_000 }) }),
  home({ id: "R-03", title: "같은 조건 거래가 4건뿐(월세 20% 높음)", basis: "사건 아님: 거래 5건 미만 (E1)", expected: false,
    trades: trades(4, { monthlyRent: 600_000 }) }),
  home({ id: "R-04", title: "월세 중앙값이 계약보다 12% 낮음", basis: "사건 기준: 내림도 변화 (E3)", expected: true,
    trades: trades(5, { monthlyRent: 440_000 }) }),
  home({ id: "R-05", title: "거래 8건 중 4건은 30㎡(면적 ±20% 밖)", basis: "사건 아님: 같은 조건 4건뿐 (E4)", expected: false,
    trades: [...trades(4, { monthlyRent: 600_000 }), ...trades(4, { monthlyRent: 600_000, areaM2: 30 })] }),
  home({ id: "R-06", title: "전세 거래·아파트 거래만 있음", basis: "사건 아님: 다른 계약 형태·주택 유형 (E5)", expected: false,
    trades: [...trades(3, { contractType: "jeonse", monthlyRent: 0, deposit: 150_000_000 }), ...trades(3, { housingType: "apartment", monthlyRent: 700_000 })] }),
  home({ id: "R-07", title: "월세는 같고 보증금 중앙값이 10% 높음", basis: "사건 기준: 보증금 변화 (E7)", expected: true,
    trades: trades(5, { deposit: 11_000_000 }) }),
  area({ id: "R-08", title: "관심 지역 첫 수집(지난 중앙값 없음)", basis: "사건 아님: 기준만 저장 (E6)", expected: false,
    trades: trades(6, { monthlyRent: 600_000 }) }, { ...AREA, lastMedianRent: null, lastMedianDeposit: null }),
  area({ id: "R-09", title: "관심 지역 월세 중앙값이 지난번보다 20% 오름", basis: "사건 기준: 10% 이상 변화 (E2)", expected: true,
    trades: trades(6, { monthlyRent: 600_000 }) }),
  area({ id: "R-10", title: "관심 지역 월세 중앙값이 지난번보다 4% 오름", basis: "사건 아님: 10% 미만 (E2)", expected: false,
    trades: trades(6, { monthlyRent: 520_000 }) }),
];
