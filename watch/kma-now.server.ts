import { cacheLife } from "next/cache";
import { fcstBase, ncstBase, parseNcst, parseSky, weatherText, type Base, type NowWeather } from "@/watch/kma-now";

// spec 020: 홈 바깥 날씨. 기상청 단기예보 조회서비스(spec 003과 같은 키 DATA_GO_KR_SERVICE_KEY). 저장하지 않고 10분 기억(E6)
const BASE_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0";
const TIMEOUT_MS = 8_000;

export type HomeWeather = NowWeather & { sky: number | null; text: string };

async function callKma(operation: string, base: Base, grid: { nx: number; ny: number }): Promise<unknown> {
  const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
  if (!serviceKey) throw new Error("DATA_GO_KR_SERVICE_KEY 없음");
  const query = new URLSearchParams({
    serviceKey, pageNo: "1", numOfRows: "100", dataType: "JSON",
    base_date: base.baseDate, base_time: base.baseTime, nx: String(grid.nx), ny: String(grid.ny),
  });
  const response = await fetch(`${BASE_URL}/${operation}?${query}`, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`기상청 ${operation} HTTP ${response.status}`);
  try {
    return JSON.parse(await response.text());
  } catch {
    throw new Error(`기상청 ${operation} 응답이 JSON이 아님`);
  }
}

/** 실황은 꼭(실패하면 던짐, E2), 하늘 상태는 실패해도 null(E4) */
export async function loadNowWeather(grid: { nx: number; ny: number }, now: Date): Promise<HomeWeather> {
  const [ncst, fcst] = await Promise.allSettled([callKma("getUltraSrtNcst", ncstBase(now), grid), callKma("getUltraSrtFcst", fcstBase(now), grid)]);
  if (ncst.status === "rejected") throw ncst.reason;
  const weather = parseNcst(ncst.value);
  let sky: number | null = null;
  try {
    if (fcst.status === "rejected") throw fcst.reason;
    sky = parseSky(fcst.value, now);
  } catch (error) {
    console.error("기상청 초단기예보(하늘 상태) 실패", error instanceof Error ? error.message : "알 수 없음");
  }
  return { ...weather, sky, text: weatherText(weather.precipitationType, sky) };
}

const SLOT_MS = 10 * 60_000;

/** E6: 지금 시각을 10분 단위로 내린 값. 같은 격자·같은 칸이면 기억한 값을 쓴다 */
export function weatherSlot(now: Date): string {
  return new Date(Math.floor(now.getTime() / SLOT_MS) * SLOT_MS).toISOString();
}

/** 격자·10분 칸마다 기억(같은 관측을 여러 번 부르지 않게) */
export async function cachedNowWeather(nx: number, ny: number, slot: string): Promise<HomeWeather> {
  "use cache";
  cacheLife({ revalidate: 600, expire: 1200 });
  return loadNowWeather({ nx, ny }, new Date(slot));
}
