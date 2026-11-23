import type { RealCost } from "@/incident/real-cost";

// spec 022 FR-011(집 비교 보드 v2-compare-tray·list-none): 비교 현황 카드 계산. 순수 함수
// 점수는 매기지 않는다(CLAUDE.md 하지 않을 것: 개인화 추천 점수). 계산한 금액만 비교한다

export type CostItemKey = "rent" | "fee" | "energy" | "transit";
const KEYS: readonly CostItemKey[] = ["rent", "fee", "energy", "transit"];

/** 비교에 올릴 수 있는 관심 주택 수(내 집 + 2곳 = 한 줄 3칸, 현경 결정 2026-11-21) */
export const MAX_COMPARE = 2;

/** spec 015 FR-001: 네 칸이 모두 있어야 합계를 믿을 수 있다. 하나라도 비면 null("합계 없음") */
export function completeTotal(cost: RealCost): number | null {
  return KEYS.every((key) => cost[key].value !== null) ? cost.total : null;
}

/** 카드마다 항목별로 가장 낮은 칸(초록 칠). 카드가 둘 이상일 때만, 미입력은 빼고, 같은 값은 모두 */
export function lowestItems(costs: readonly RealCost[]): Set<CostItemKey>[] {
  const result = costs.map(() => new Set<CostItemKey>());
  if (costs.length < 2) return result;
  for (const key of KEYS) {
    const values = costs.map((cost) => cost[key].value).filter((v): v is number => v !== null);
    if (values.length < 2) continue;
    const min = Math.min(...values);
    costs.forEach((cost, index) => {
      if (cost[key].value === min) result[index].add(key);
    });
  }
  return result;
}

export type DiffText = { text: string; tone: "lower" | "higher" | "same" };

/** "내 집보다 49,000원 낮아요". 어느 쪽이든 합계가 없으면 null */
export function diffFromMineText(total: number | null, mineTotal: number | null): DiffText | null {
  if (total === null || mineTotal === null) return null;
  const diff = total - mineTotal;
  if (diff === 0) return { text: "내 집과 같아요", tone: "same" };
  const amount = `${Math.abs(diff).toLocaleString("ko-KR")}원`;
  return diff < 0 ? { text: `내 집보다 ${amount} 낮아요`, tone: "lower" } : { text: `내 집보다 ${amount} 높아요`, tone: "higher" };
}

/** 비교에 넣기·빼기. 이미 두 곳이면 세 번째는 넣지 않고 refused */
export function toggleCompare(selected: readonly string[], id: string): { selected: string[]; refused: boolean } {
  if (selected.includes(id)) return { selected: selected.filter((s) => s !== id), refused: false };
  if (selected.length >= MAX_COMPARE) return { selected: [...selected], refused: true };
  return { selected: [...selected, id], refused: false };
}
