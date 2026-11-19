import Link from "next/link";
import { Empty } from "@/app/_components/states";
import type { HomeUsage } from "@/incident/energy-estimate";

export const USAGE_KIND: Record<HomeUsage["kind"], string> = { input: "내가 넣은 값", estimated: "추정값" };

/** 내 집이 없거나 사용량을 알 수 없을 때 (spec 011 FR-003, E2) */
export function NoUsage({ hasHome, failed }: { hasHome: boolean; failed: number }) {
  if (!hasHome) return <Empty>내 집을 넣으면 그 지역 기준으로 예상 사용량과 요금을 보여 드립니다. <Link href="/my/home">내 집 입력</Link></Empty>;
  if (failed) return <Empty>한전 통계를 불러오지 못해 사용량을 추정하지 못했습니다. 잠시 뒤 다시 열거나 <Link href="/my/home">내 집</Link>에 전기 사용량(kWh)을 넣어 주세요.</Empty>;
  return <Empty>이 지역의 한전 통계가 없어 사용량을 추정하지 못했습니다. <Link href="/my/home">내 집</Link>에 전기 사용량(kWh)을 넣으면 계산합니다.</Empty>;
}
