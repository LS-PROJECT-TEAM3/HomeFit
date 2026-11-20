// spec 015 FR-001~003: 집 비교 "추천 결과". 점수 없이 실질 주거비 낮은 순위와 계산한 숫자로 된 근거 글. 순수 함수
// PRD 9절 "개인화 추천 점수"는 그대로 하지 않는다(spec 015 Q1)
import type { CompareRow, CostItem, EstimateSource } from "@/incident/real-cost";

export type RankedHome = { id: string; name: string; rank: number; total: number; reasons: string[] };
export type IncompleteHome = { id: string; name: string; missing: string[]; reason: string };
export type Recommendation = { ranked: RankedHome[]; incomplete: IncompleteHome[] };

const won = (value: number): string => `${value.toLocaleString("ko-KR")}원`;

/** E5: 1위는 "가장 낮음", 나머지는 1위와의 차이 */
function headline(rank: number, total: number, firstTotal: number): string {
  if (rank === 1) return `한 달 실질 주거비 ${won(total)}으로 가장 낮습니다.`;
  return `한 달 실질 주거비 ${won(total)}, 1위보다 ${won(total - firstTotal)} 더 듭니다.`;
}

function compareWithMine(total: number, mine: number | null): string | null {
  if (mine === null) return null; // E4
  const diff = total - mine;
  if (diff === 0) return "내 집과 한 달 실질 주거비가 같습니다.";
  return `내 집보다 한 달 ${won(Math.abs(diff))} ${diff < 0 ? "덜" : "더"} 듭니다.`;
}

// 선우 qa 015 #1(2026-11-20): 근거 문구가 실제 계산 방법을 따르게(아파트는 국토부 금액)
const ESTIMATE_SOURCE: Record<EstimateSource, string> = {
  apt: "국토부 시군구 아파트 평균 금액 × 전용면적",
  kepco: "한전 시군구 평균 전력사용량",
  national: "가구에너지패널 전국 평균 전력사용량",
};

function estimateNote(name: string, item: CostItem): string {
  return item.basis ? `${name}는 추정값입니다(${ESTIMATE_SOURCE[item.basis]}).` : `${name}는 추정값입니다.`;
}

/**
 * @param rows compareRealCosts 결과(spec 009). 내 집 줄은 비교 기준으로만 쓴다(Q2)
 */
export function recommendHomes(rows: readonly CompareRow[]): Recommendation {
  const mine = rows.find((r) => r.isMine)?.cost.total ?? null;
  const homes = rows.filter((r) => !r.isMine);
  // FR-002: 미입력 칸이 있으면 합계가 낮게 보이므로 순위에 넣지 않는다. E3: 같은 합계는 들어온 순서(안정 정렬)
  const complete = homes.filter((r) => r.cost.missing.length === 0).toSorted((a, b) => a.cost.total - b.cost.total);
  const firstTotal = complete[0]?.cost.total ?? 0;
  const ranked = complete.map((row, i) => {
    const estimated = row.cost.energy.kind === "estimated" ? [estimateNote("에너지비", row.cost.energy)] : [];
    const reasons = [headline(i + 1, row.cost.total, firstTotal), compareWithMine(row.cost.total, mine), ...estimated];
    return { id: row.id, name: row.name, rank: i + 1, total: row.cost.total, reasons: reasons.filter((r): r is string => r !== null) };
  });
  const incomplete = homes
    .filter((r) => r.cost.missing.length > 0)
    .map((row) => ({ id: row.id, name: row.name, missing: row.cost.missing, reason: `${row.cost.missing.join("·")}를 넣으면 순위에 들어갑니다.` }));
  return { ranked, incomplete };
}
