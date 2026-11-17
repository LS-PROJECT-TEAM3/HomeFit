/** FR-006 (spec 002): 한 번 수집에서 AI를 부를 수 있는 수. Q22 확인 뒤 조정 */
export const DEFAULT_CALLS_PER_RUN = 20;

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
