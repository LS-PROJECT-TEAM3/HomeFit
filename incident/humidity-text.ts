import type { WindowType } from "@/incident/condensation";
import { toKstHourLabel } from "@/watch/kst";

// FR-006 (spec 003): 습도·결로 사건 화면 글자. 순수 함수(현재 시각은 인자)

const HOUR_MS = 3_600_000;

/** 가장 위험한 시각과 남은 시간. 상태는 색만이 아니라 글자로 보인다(디자인 기본선 5) */
export function describeRiskTime(riskAt: string, now: Date): { at: string; remaining: string } {
  const diff = Date.parse(riskAt) - now.getTime();
  const at = toKstHourLabel(new Date(riskAt));
  if (diff < 0) return { at, remaining: "지남" };
  if (diff < HOUR_MS) return { at, remaining: "1시간 안" };
  return { at, remaining: `${Math.floor(diff / HOUR_MS)}시간 남음` };
}

const WINDOW_TEXT: Record<WindowType, string> = { single: "홑유리", double: "이중유리", unknown: "모름(홑유리로 계산)" };

export function windowTypeText(windowType: WindowType): string {
  return WINDOW_TEXT[windowType];
}
