import { latestBaseTime } from "@/watch/kma";

// FR-011 (spec 003): 개발 환경에서만 쓰는 가짜 기상청 예보. 실제 응답(watch/fixtures/kma-sample.json)과 같은 모양
// cold: 20시간 뒤 -5°C / colder: 같은 시각 -10°C(갱신 시험) / humid: 덥고 습함 / safe: 15°C / failure: 결과 코드 오류 / malformed: 모양이 다름

export const WEATHER_FIXTURE_NAMES = ["cold", "colder", "humid", "safe", "failure", "malformed"] as const;
export type WeatherFixtureName = (typeof WEATHER_FIXTURE_NAMES)[number];

export function isWeatherFixtureName(name: string): name is WeatherFixtureName {
  return (WEATHER_FIXTURE_NAMES as readonly string[]).includes(name);
}

const HOURS = 60;
const COLDEST_HOUR = 20;

type Hourly = { temperature: number; humidity: number; precipitationType: number };

function valuesAt(name: WeatherFixtureName, hour: number): Hourly {
  if (name === "cold") return { temperature: hour === COLDEST_HOUR ? -5 : 3, humidity: 60, precipitationType: 0 };
  if (name === "colder") return { temperature: hour === COLDEST_HOUR ? -10 : 3, humidity: 60, precipitationType: 0 };
  if (name === "humid") return { temperature: 23, humidity: hour <= 30 ? 90 : 60, precipitationType: hour <= 6 ? 1 : 0 };
  return { temperature: 15, humidity: 50, precipitationType: 0 };
}

function kstParts(at: Date): { date: string; time: string } {
  const kst = new Date(at.getTime() + 9 * 3_600_000).toISOString();
  return { date: kst.slice(0, 10).replaceAll("-", ""), time: `${kst.slice(11, 13)}00` };
}

/** now 다음 정시부터 60시간치 예보 */
export function buildWeatherFixture(name: WeatherFixtureName, now: Date): unknown {
  if (name === "failure") return { response: { header: { resultCode: "03", resultMsg: "NO_DATA" } } };
  if (name === "malformed") return { response: { header: { resultCode: "00" }, body: { items: "고장" } } };
  const { baseDate, baseTime } = latestBaseTime(now);
  const start = Math.ceil(now.getTime() / 3_600_000) * 3_600_000;
  const item = Array.from({ length: HOURS }, (_, index) => {
    const { date, time } = kstParts(new Date(start + index * 3_600_000));
    const values = valuesAt(name, index + 1);
    const base = { baseDate, baseTime, fcstDate: date, fcstTime: time, nx: 0, ny: 0 };
    return [
      { ...base, category: "TMP", fcstValue: String(values.temperature) },
      { ...base, category: "REH", fcstValue: String(values.humidity) },
      { ...base, category: "PTY", fcstValue: String(values.precipitationType) },
    ];
  }).flat();
  return { response: { header: { resultCode: "00", resultMsg: "NORMAL_SERVICE" }, body: { dataType: "JSON", items: { item }, totalCount: item.length } } };
}
