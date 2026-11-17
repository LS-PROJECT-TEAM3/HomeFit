import type { HourlyForecast } from "@/incident/condensation";

// FR-003 (spec 003): 기상청 단기예보(getVilageFcst) 응답 해석과 발표 시각 고르기. 순수 함수
// 응답 모양은 2026-11-17 실제 응답으로 확인(watch/fixtures/kma-sample.json)

const KST_OFFSET_MS = 9 * 3_600_000;
const BASE_HOURS = [2, 5, 8, 11, 14, 17, 20, 23];
// 발표 뒤 10분부터 받을 수 있다(기상청 활용가이드)
const AVAILABLE_AFTER_MIN = 10;

type RawItem = { category?: unknown; fcstDate?: unknown; fcstTime?: unknown; fcstValue?: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function itemsOf(json: unknown): RawItem[] {
  const response = isRecord(json) ? json.response : undefined;
  if (!isRecord(response) || !isRecord(response.header)) throw new Error("기상청 응답 모양이 다릅니다");
  const code = String(response.header.resultCode ?? "");
  if (code !== "00") throw new Error(`기상청 응답 오류 ${code}: ${String(response.header.resultMsg ?? "")}`);
  const body = isRecord(response.body) ? response.body : undefined;
  const items = isRecord(body?.items) ? body.items.item : undefined;
  if (!Array.isArray(items) || items.length === 0) throw new Error("기상청 응답에 예보가 없습니다");
  return items as RawItem[];
}

function toNumber(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  return Number(text);
}

/** "20261118" + "0600"(KST) → ISO */
function forecastIso(date: string, time: string): string | null {
  if (!/^\d{8}$/.test(date) || !/^\d{4}$/.test(time)) return null;
  const iso = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${time.slice(0, 2)}:${time.slice(2, 4)}:00+09:00`;
  return new Date(iso).toISOString();
}

const FIELD: Record<string, keyof Omit<HourlyForecast, "forecastAt">> = { TMP: "temperature", REH: "humidity", PTY: "precipitationType" };

/** 응답 → 시각 순 시간별 예보. 결과 코드 오류·빈 응답은 던진다(수집 오류로 기록) */
export function parseKmaForecast(json: unknown): HourlyForecast[] {
  const byTime = new Map<string, HourlyForecast>();
  for (const item of itemsOf(json)) {
    const field = FIELD[String(item.category)];
    const at = forecastIso(String(item.fcstDate ?? ""), String(item.fcstTime ?? ""));
    if (!field || !at) continue;
    const hour = byTime.get(at) ?? { forecastAt: at, temperature: null, humidity: null, precipitationType: null };
    hour[field] = toNumber(item.fcstValue);
    byTime.set(at, hour);
  }
  if (byTime.size === 0) throw new Error("기상청 응답에서 읽을 수 있는 예보가 없습니다");
  return [...byTime.values()].sort((a, b) => a.forecastAt.localeCompare(b.forecastAt));
}

/** 지금 받을 수 있는 가장 최근 발표(KST) */
export function latestBaseTime(now: Date): { baseDate: string; baseTime: string } {
  const kst = new Date(now.getTime() + KST_OFFSET_MS - AVAILABLE_AFTER_MIN * 60_000);
  const hour = kst.getUTCHours();
  const base = [...BASE_HOURS].reverse().find((candidate) => candidate <= hour);
  // 02시 발표 전(00:00~02:09)이면 전날 23시
  if (base === undefined) kst.setUTCDate(kst.getUTCDate() - 1);
  const date = kst.toISOString().slice(0, 10).replaceAll("-", "");
  return { baseDate: date, baseTime: `${String(base ?? 23).padStart(2, "0")}00` };
}
