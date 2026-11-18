/**
 * FR-006 (spec 002): 한 번 수집에서 AI를 부를 수 있는 수.
 * Q22 (2026-11-17 AI Studio): gemini-3.5-flash-lite 무료 한도 분당 15·하루 500.
 * 한 수집은 1분 안팎이라 분당 한도(15)보다 작게 12로 둔다. 하루 1번 수집이면 하루 한도의 절반(250)보다 한참 작다.
 */
export const DEFAULT_CALLS_PER_RUN = 12;

export type CallBudget = { tryTake(): boolean; skipped(): number; used(): number };

export function createCallBudget(limit: number): CallBudget {
  let used = 0;
  let skipped = 0;
  return {
    tryTake() {
      if (used >= limit) {
        skipped += 1;
        return false;
      }
      used += 1;
      return true;
    },
    skipped: () => skipped,
    used: () => used,
  };
}
