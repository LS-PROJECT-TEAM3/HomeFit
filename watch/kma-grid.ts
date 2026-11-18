import grid from "@/watch/kma-grid.json";

// FR-003 (spec 003): 시군구 코드 → 기상청 예보 격자. Q15 가정: 시군구마다 대표 격자 하나
// kma-grid.json: 기상청 활용가이드(2610) 격자 엑셀의 시도·시군구 행. 만든 방법은 plan 003 변경 기록

// JSON은 [nx, ny] 두 칸
export type GridTable = { sido: Record<string, readonly number[]>; sigungu: Record<string, readonly number[]> };
export type Grid = { nx: number; ny: number; precision: "sigungu" | "city" | "sido" };

function toGrid(cell: readonly number[], precision: Grid["precision"]): Grid {
  return { nx: cell[0], ny: cell[1], precision };
}

/** 표에 없으면 같은 시의 첫 구(41130 성남시 → 41131), 그다음 시도 대표. 모르면 null */
export function findGrid(table: GridTable, sigunguCode: string): Grid | null {
  if (!/^\d{5}$/.test(sigunguCode)) return null;
  const exact = table.sigungu[sigunguCode];
  if (exact) return toGrid(exact, "sigungu");
  const cityPrefix = sigunguCode.slice(0, 4);
  const ward = Object.keys(table.sigungu).sort().find((code) => code.startsWith(cityPrefix));
  if (ward) return toGrid(table.sigungu[ward], "city");
  const sido = table.sido[sigunguCode.slice(0, 2)];
  return sido ? toGrid(sido, "sido") : null;
}

export function gridForSigungu(sigunguCode: string): Grid | null {
  return findGrid(grid, sigunguCode);
}
