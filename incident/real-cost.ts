// spec 009 FR-003~006 (PRD FR-28 v1.10): 실질 주거비 = 월세 + 관리비 + 에너지비 + 교통비. 순수 함수 [GLOSSARY 실질 주거비]

/**
 * 한전 주택용 저압 요금표 (spec 009 Q2: 공식 페이지 적용일 2023-11-09, 2026-11-18 확인. 2026년 민간 계산기 값과 같음).
 * https://cyber.kepco.co.kr/ckepco/front/jsp/CY/E/E/CYEEHP00101.jsp
 * 기후환경요금·연료비조정요금·부가세·전력기금은 공식 페이지에 없어 넣지 않는다(화면에 "부가 요금 제외")
 */
export const RATE_TABLE = {
  base: [910, 1_600, 7_300],
  perKwh: [120.0, 214.6, 307.3],
  limits: { summer: [300, 450], other: [200, 400] },
  superUserKwh: 1_000,
  superUserRate: 736.2,
} as const;

const SUMMER = new Set([7, 8]);
// spec 009 Q1 가정: 슈퍼유저 요금은 하계와 동계(12~2월)
const SUPER_USER_MONTHS = new Set([7, 8, 12, 1, 2]);

/** spec 009 FR-004: 기본요금 + 전력량요금(누진 3단계). 원 미만 버림. @param month 1~12 */
export function electricityBill(kwh: number, month: number): number {
  const [first, second] = SUMMER.has(month) ? RATE_TABLE.limits.summer : RATE_TABLE.limits.other;
  const tier = kwh <= first ? 0 : kwh <= second ? 1 : 2;
  const superKwh = SUPER_USER_MONTHS.has(month) ? Math.max(0, kwh - RATE_TABLE.superUserKwh) : 0;
  const parts = [Math.min(kwh, first), Math.max(0, Math.min(kwh, second) - first), Math.max(0, kwh - second - superKwh)];
  const energy = parts.reduce((sum, part, i) => sum + part * RATE_TABLE.perKwh[i], 0) + superKwh * RATE_TABLE.superUserRate;
  return RATE_TABLE.base[tier] + Math.floor(energy + 1e-9);
}

/** 값의 종류: 입력값 / 계산값 / 추정값(spec 011 FR-002) / 미입력 (spec 009 FR-005 칸마다 글자로) */
export type CostItem = { value: number | null; kind: "input" | "calculated" | "estimated" | "missing" };
export type CostInput = {
  monthlyRent: number; maintenanceFee: number | null;
  energyCost: number | null; electricityKwh: number | null;
  transitFare: number | null; tripsPerDay: number | null; commuteDays: number | null;
  /** spec 011 FR-001: 그 집 시군구의 한전 가구 평균(kWh/월). 없으면 추정하지 않는다 */
  estimatedKwh?: number | null;
};
export type RealCost = { rent: CostItem; fee: CostItem; energy: CostItem; transit: CostItem; total: number; missing: string[]; estimated: string[] };

// E6: 하루 횟수·출근 일수가 비면 출퇴근 2번, 한 달 22일
const DEFAULT_TRIPS = 2;
const DEFAULT_DAYS = 22;

const input = (value: number | null): CostItem => (value === null ? { value: null, kind: "missing" } : { value, kind: "input" });

// E4: 직접 입력 > 전기 사용량 계산 > 추정(spec 011 FR-002) > 미입력
function energyItem(home: CostInput, month: number): CostItem {
  if (home.energyCost !== null) return { value: home.energyCost, kind: "input" };
  if (home.electricityKwh !== null) return { value: electricityBill(home.electricityKwh, month), kind: "calculated" };
  if (home.estimatedKwh && home.estimatedKwh > 0) return { value: electricityBill(home.estimatedKwh, month), kind: "estimated" };
  return { value: null, kind: "missing" };
}

function transitItem(home: CostInput): CostItem {
  if (home.transitFare === null) return { value: null, kind: "missing" };
  return { value: home.transitFare * (home.tripsPerDay ?? DEFAULT_TRIPS) * (home.commuteDays ?? DEFAULT_DAYS), kind: "calculated" };
}

/** E5: 빈 칸은 0으로 넣지 않고 미입력으로 합계에서 뺀다 */
export function realCost(home: CostInput, month: number): RealCost {
  const items = { rent: input(home.monthlyRent), fee: input(home.maintenanceFee), energy: energyItem(home, month), transit: transitItem(home) };
  const labels = { rent: "월세", fee: "관리비", energy: "에너지비", transit: "교통비" } as const;
  const entries = Object.entries(items) as [keyof typeof labels, CostItem][];
  return {
    ...items,
    total: entries.reduce((sum, [, item]) => sum + (item.value ?? 0), 0),
    missing: entries.filter(([, item]) => item.kind === "missing").map(([key]) => labels[key]),
    estimated: entries.filter(([, item]) => item.kind === "estimated").map(([key]) => labels[key]),
  };
}

export type CompareRow = { id: string; name: string; isMine: boolean; cost: RealCost; diffFromMine: number | null };

/** spec 009 FR-005: 내 집과 관심 주택, 합계 낮은 순, 내 집 대비 차이(E7: 내 집이 없으면 null) */
export function compareRealCosts({ myHome, homes, month }: {
  myHome: CostInput | null; homes: readonly (CostInput & { id: string; name: string })[]; month: number;
}): CompareRow[] {
  const mine = myHome ? realCost(myHome, month) : null;
  const rows: CompareRow[] = homes.map((h) => ({ id: h.id, name: h.name, isMine: false, cost: realCost(h, month), diffFromMine: null }));
  if (mine) rows.push({ id: "mine", name: "내 집", isMine: true, cost: mine, diffFromMine: 0 });
  return rows
    .map((row) => ({ ...row, diffFromMine: mine ? row.cost.total - mine.total : null }))
    .sort((a, b) => a.cost.total - b.cost.total);
}

/** spec 009 FR-006: 공고 최저 월세 - 내 월세. 하나라도 없으면 null(줄을 보이지 않음) */
export function noticeRentDelta(noticeRent: number | null, myRent: number | null): number | null {
  return noticeRent === null || myRent === null ? null : noticeRent - myRent;
}
