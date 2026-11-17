import { OutOfScopeChart } from "@/app/_components/out-of-scope-chart";

export const metadata = { title: "예상 에너지 사용량 | 에너지 분석 | HomeFit AI" };

// 기획안 Energy Analysis "예상 에너지 사용량" (spec 004 Q3): PRD 9절 하지 않을 것
export default function EnergyUsagePage() {
  return <OutOfScopeChart title="예상 에너지 사용량" reason="PRD 9절에서 에너지 시뮬레이션 고도화는 하지 않기로 했습니다. 하려면 PRD를 먼저 고칩니다." />;
}
