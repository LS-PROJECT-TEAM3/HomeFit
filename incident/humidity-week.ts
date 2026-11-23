// spec 022 FR-011(집 점검 하자·환경 기록 보드 v2-qc-log-pc): 최근 7일 실내 습도 점 그래프 좌표. 순수 함수(오늘은 인자)
// 그림 상자 440×190, 점은 x 14~426, y 50(가장 큼)~116(가장 작음). 값이 모두 같으면 가운데

const WIDTH = 440;
const PAD_X = 14;
const TOP_Y = 50;
const BOTTOM_Y = 116;
const DAY_MS = 86_400_000;

export type WeekDay = { date: string; label: string; x: number; hasValue: boolean };
export type WeekPoint = { date: string; x: number; y: number; value: number };

const kstDate = (iso: string) => new Date(Date.parse(iso) + 9 * 3_600_000).toISOString().slice(0, 10);
const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

export function humidityWeek(measurements: readonly { measuredAt: string; humidityPct: number }[], today: string): { days: WeekDay[]; points: WeekPoint[] } {
  const step = (WIDTH - PAD_X * 2) / 6;
  const latest = new Map<string, { at: number; value: number }>();
  for (const item of measurements) {
    const date = kstDate(item.measuredAt);
    const at = Date.parse(item.measuredAt);
    const prev = latest.get(date);
    if (!prev || at > prev.at) latest.set(date, { at, value: item.humidityPct });
  }
  const days: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    const label = i === 0 ? `${date.slice(5, 7)}.${date.slice(8, 10)}` : String(Number(date.slice(8, 10)));
    return { date, label, x: Math.round((PAD_X + i * step) * 10) / 10, hasValue: latest.has(date) };
  });
  const values = days.filter((d) => d.hasValue).map((d) => latest.get(d.date)!.value);
  const min = Math.min(...values);
  const span = Math.max(...values) - min;
  const points = days.filter((d) => d.hasValue).map((d) => {
    const value = latest.get(d.date)!.value;
    const y = span === 0 ? (TOP_Y + BOTTOM_Y) / 2 : BOTTOM_Y - ((value - min) / span) * (BOTTOM_Y - TOP_Y);
    return { date: d.date, x: d.x, y: Math.round(y * 10) / 10, value };
  });
  return { days, points };
}
