import { OutOfScopeChart } from "@/app/_components/out-of-scope-chart";

export const metadata = { title: "냉난방비 시뮬레이션 | 에너지 분석 | HomeFit AI" };

// 기획안 Energy Analysis "냉난방비 시뮬레이션": 도시가스·난방비 계산은 하지 않음(spec 009·011 하지 않을 것)
export default function EnergyHeatingPage() {
  return <OutOfScopeChart title="냉난방비 시뮬레이션" reason="도시가스·난방비 요금 계산은 하지 않기로 했습니다(spec 009·011 하지 않을 것). 결로 위험은 집 점검에서 볼 수 있습니다." />;
}
