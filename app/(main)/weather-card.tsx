import { gridForSigungu } from "@/watch/kma-grid";
import { cachedNowWeather, weatherSlot } from "@/watch/kma-now.server";

const one = (n: number) => (Math.round(n * 10) / 10).toLocaleString("ko-KR");

/** 바깥 값 글자. 격자가 없거나 불러오지 못해도 다른 칸은 그대로 (spec 020 E2) */
async function outdoorText(sigunguCode: string, now: Date): Promise<string> {
  const grid = gridForSigungu(sigunguCode);
  if (!grid) return "정보 없음";
  try {
    const weather = await cachedNowWeather(grid.nx, grid.ny, weatherSlot(now));
    return `${weather.text} ${one(weather.temperature)}°C`;
  } catch (error) {
    console.error("홈 바깥 날씨 불러오기 실패", error instanceof Error ? error.message : "알 수 없음");
    return "불러오지 못함";
  }
}

// IA HM_000000_PG, PRD FR-39, spec 020 → spec 022 FR-011: 홈 "우리 집 상태"의 바깥 값("맑음 0.5°C"). 결로 판단은 바꾸지 않는다
export async function OutdoorWeather({ sigunguCode, now }: { sigunguCode: string; now: Date }) {
  return <>{await outdoorText(sigunguCode, now)}</>;
}
