import type { BandTab } from "@/app/_components/section-band";

// IA v1.17 에너지 분석 탭(캔버스 이름): 전기 / 난방비. 월별 예상 비용은 전기 탭으로 합침
export const ENERGY_TABS: BandTab[] = [
  { href: "/energy", label: "전기" },
  { href: "/energy/heating", label: "난방비" }, // spec 016
];
