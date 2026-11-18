import { connection } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { collectWeather } from "@/watch/collect-weather.server";
import { kmaApiFetcher, type ForecastFetcher } from "@/watch/kma.server";
import { buildWeatherFixture, isWeatherFixtureName } from "@/watch/weather-fixtures";

/**
 * FR-003, FR-011 (spec 003): 기상청 예보 수집 입구. Vercel Cron이 Authorization: Bearer CRON_SECRET을 붙여 부른다.
 * 개발 중에는 ?fixture=cold 처럼 가짜 예보로 돌릴 수 있다(운영 배포에서는 막음).
 */
export const maxDuration = 300;

export async function GET(request: Request) {
  await connection();

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const fixture = new URL(request.url).searchParams.get("fixture");
  let fetchForecast: ForecastFetcher;
  if (fixture) {
    if (process.env.NODE_ENV === "production" || !isWeatherFixtureName(fixture)) {
      return Response.json({ error: "가짜 예보는 개발 환경에서만, 정해진 이름으로만 쓸 수 있습니다." }, { status: 400 });
    }
    fetchForecast = async () => buildWeatherFixture(fixture, new Date());
  } else {
    const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
    if (!serviceKey) return Response.json({ error: "DATA_GO_KR_SERVICE_KEY가 없습니다." }, { status: 500 });
    fetchForecast = kmaApiFetcher(serviceKey);
  }

  const summary = await collectWeather({
    db: createAdminClient(),
    fetchForecast,
    trigger: fixture ? "simulation" : "scheduled",
    now: new Date(),
  });
  return Response.json(summary, { status: summary.status === "succeeded" ? 200 : 502 });
}
