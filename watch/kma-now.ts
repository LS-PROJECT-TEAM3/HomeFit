// spec 020 FR-001·FR-002: 기상청 초단기실황(getUltraSrtNcst)·초단기예보(getUltraSrtFcst) 해석과 기준 시각. 순수 함수
// 응답 모양: 2026-11-19 실제 호출 {response:{header:{resultCode:"00"},body:{items:{item:[{category,obsrValue,baseDate,baseTime}]}}}}

const KST_MS = 9 * 60 * 60 * 1000;
const SHAPE_ERROR = "기상청 초단기 응답 모양이 다름";

export type Base = { baseDate: string; baseTime: string };

/** 한국 시각에서 minutesBack분 전으로 옮긴 날짜·시 */
function kstShift(now: Date, minutesBack: number): { date: string; hour: string } {
  const kst = new Date(now.getTime() + KST_MS - minutesBack * 60_000);
  return { date: kst.toISOString().slice(0, 10).replaceAll("-", ""), hour: String(kst.getUTCHours()).padStart(2, "0") };
}

/** E3: 정시 관측은 10분쯤 뒤에 나와 15분 전의 정시를 묻는다 */
export function ncstBase(now: Date): Base {
  const { date, hour } = kstShift(now, 15);
  return { baseDate: date, baseTime: `${hour}00` };
}

/** E3: 초단기예보는 매시 30분 발표, 45분쯤 뒤에 나와 45분 전 기준 */
export function fcstBase(now: Date): Base {
  const { date, hour } = kstShift(now, 45);
  return { baseDate: date, baseTime: `${hour}30` };
}

type Item = Record<string, unknown>;

function items(json: unknown): Item[] {
  const response = (json as { response?: { header?: { resultCode?: unknown }; body?: { items?: { item?: unknown } } } } | null)?.response;
  if (!response?.header) throw new Error(SHAPE_ERROR);
  const code = String(response.header.resultCode ?? "");
  if (code !== "00") throw new Error(`기상청 초단기 오류 ${code}`);
  const list = response.body?.items?.item;
  if (!Array.isArray(list)) throw new Error(SHAPE_ERROR);
  return list as Item[];
}

export type NowWeather = { temperature: number; humidity: number; precipitationType: number; rain1h: number | null; windSpeed: number | null; observedAt: string };

/** FR-001: 기온(T1H)·습도(REH)는 꼭 있어야 하고, 나머지는 없으면 null */
export function parseNcst(json: unknown): NowWeather {
  const list = items(json);
  const value = (category: string): number | null => {
    const found = list.find((i) => i.category === category);
    const n = Number(found?.obsrValue);
    return found && Number.isFinite(n) ? n : null;
  };
  const temperature = value("T1H");
  const humidity = value("REH");
  const first = list[0];
  if (temperature === null || humidity === null || typeof first?.baseDate !== "string" || typeof first.baseTime !== "string") throw new Error(SHAPE_ERROR);
  const d = first.baseDate;
  const t = first.baseTime;
  return {
    temperature, humidity, precipitationType: value("PTY") ?? 0, rain1h: value("RN1"), windSpeed: value("WSD"),
    observedAt: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${t.slice(0, 2)}:${t.slice(2, 4)}`,
  };
}

/** FR-002, E4: 지금 시각 이후 가장 가까운 예보 시각의 하늘 상태(SKY). 없으면 null */
export function parseSky(json: unknown, now: Date): number | null {
  const { date, hour } = kstShift(now, 0);
  const current = `${date}${hour}00`;
  const skies = items(json)
    .filter((i) => i.category === "SKY" && `${i.fcstDate}${i.fcstTime}` >= current)
    .sort((a, b) => `${a.fcstDate}${a.fcstTime}`.localeCompare(`${b.fcstDate}${b.fcstTime}`));
  const n = Number(skies[0]?.fcstValue);
  return skies.length && Number.isFinite(n) ? n : null;
}

// 기상청 단기예보 조회서비스 코드값(초단기실황 PTY, 하늘 상태 SKY)
const PTY_TEXT: Record<number, string> = { 1: "비", 2: "비/눈", 3: "눈", 5: "빗방울", 6: "빗방울눈날림", 7: "눈날림" };
const SKY_TEXT: Record<number, string> = { 1: "맑음", 3: "구름많음", 4: "흐림" };

/** FR-002: 비·눈이 오면 강수 형태, 아니면 하늘 상태 */
export function weatherText(precipitationType: number, sky: number | null): string {
  if (PTY_TEXT[precipitationType]) return PTY_TEXT[precipitationType];
  return sky !== null && SKY_TEXT[sky] ? SKY_TEXT[sky] : "하늘 상태 정보 없음";
}
