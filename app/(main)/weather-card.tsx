import { Suspense } from "react";
import { measurementState } from "@/incident/home-dashboard";
import { gridForSigungu } from "@/watch/kma-grid";
import { cachedNowWeather, weatherSlot, type HomeWeather } from "@/watch/kma-now.server";
import type { HomeDashboard } from "./dashboard-load";
import styles from "./page.module.css";

const one = (n: number) => (Math.round(n * 10) / 10).toLocaleString("ko-KR");

function observedText(observedAt: string): string {
  const [date, time] = observedAt.split("T");
  return `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일 ${time} 관측`;
}

/** spec 020 FR-003: 최근 7일 안의 실내 측정값이 있으면 기온 차이 */
function IndoorCompare({ data, weather, now }: { data: HomeDashboard; weather: HomeWeather; now: Date }) {
  const latest = data.measurements[0];
  if (!latest || measurementState(latest.measuredAt, now) !== "fresh") return null;
  const gap = latest.temperatureC - weather.temperature;
  return <p className="tabular-nums">실내 {one(latest.temperatureC)}℃ · 바깥 {one(weather.temperature)}℃ (차이 {one(Math.abs(gap))}℃)</p>;
}

async function WeatherBody({ data, now }: { data: HomeDashboard; now: Date }) {
  const grid = data.home ? gridForSigungu(data.home.sigunguCode) : null;
  if (!grid) return <p className={styles.muted}>이 지역의 기상청 격자를 찾지 못해 날씨를 보여 드리지 못합니다.</p>;
  let weather: HomeWeather;
  try {
    weather = await cachedNowWeather(grid.nx, grid.ny, weatherSlot(now));
  } catch (error) {
    console.error("홈 바깥 날씨 불러오기 실패", error instanceof Error ? error.message : "알 수 없음");
    // spec 020 E2: 다른 카드는 그대로, 이 카드만 실패를 글로
    return <p role="alert">날씨를 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</p>;
  }
  return (
    <>
      <strong className={`${styles.headline} tabular-nums`}>{weather.text} · {one(weather.temperature)}℃</strong>
      <dl className={styles.facts}>
        <div><dt>습도</dt><dd className="tabular-nums">{weather.humidity}%</dd></div>
        <div><dt>바람</dt><dd className="tabular-nums">{weather.windSpeed === null ? "정보 없음" : `${one(weather.windSpeed)}m/s`}</dd></div>
        <div><dt>1시간 강수</dt><dd className="tabular-nums">{weather.rain1h === null ? "정보 없음" : `${one(weather.rain1h)}mm`}</dd></div>
      </dl>
      <IndoorCompare data={data} weather={weather} now={now} />
      <span className={styles.muted}>
        기상청 초단기실황, {observedText(weather.observedAt)}{grid.precision === "sigungu" ? "" : " · 가까운 지역 값"}
      </span>
    </>
  );
}

// IA HM_000000_PG v1.14, PRD FR-39, spec 020: 내 집 시군구의 지금 바깥 날씨. 결로 판단은 바꾸지 않는다
export function WeatherCard({ data, now }: { data: HomeDashboard; now: Date }) {
  if (!data.home) return null; // spec 020 E1: 나의 주거 정보 카드가 내 집 등록을 안내한다
  return (
    <section className={`${styles.card} ${styles.span2}`} aria-labelledby="weather-title">
      <span id="weather-title" className={styles.cardLabel}>바깥 날씨 (지금)</span>
      <Suspense fallback={<p className={styles.muted} role="status">날씨를 불러오는 중…</p>}>
        <WeatherBody data={data} now={now} />
      </Suspense>
    </section>
  );
}
