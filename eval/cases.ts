// spec 005 FR-004 (PRD FR-25): 감지 채점 정답 묶음. 모두 가짜 자료다(실제 공고·개인 정보 아님, rules/git-security 보안)
// 정답(expected)은 문제정의 "사건 기준" 표와 spec 001·003의 경계 상황에서 가져왔다. 규칙 코드에서 정답을 만들지 않는다
import type { PolicyCondition } from "@/incident/match";
import type { TrackedValues } from "@/incident/notice-change";
import type { HourlyForecast, Measurement, WindowType } from "@/incident/condensation";
import type { Notice } from "@/watch/notice";

export const EVAL_TODAY = "2026-11-18";
export const EVAL_NOW = "2026-11-18T09:00:00+09:00";

export type NoticeCase = {
  kind: "notice";
  id: string;
  title: string;
  /** 정답 근거 */
  basis: string;
  expected: boolean;
  notice: Notice;
  previous: TrackedValues | null;
  followed: boolean;
  seenAnnouncementIds?: string[];
  seenComplexKeys?: string[];
  condition: PolicyCondition;
};

export type HumidityCase = {
  kind: "humidity";
  id: string;
  title: string;
  basis: string;
  expected: boolean;
  measurement: Measurement | null;
  windowType: WindowType;
  forecast: HourlyForecast[];
};

export type EvalCase = NoticeCase | HumidityCase;

const CONDITION: PolicyCondition = { sidoCode: "41", sigunguCode: "41390", supplyTypes: ["ALL"], maxMonthlyRent: 500000, age: 27, targetGroups: ["youth"] };

function notice(over: Partial<Notice>): Notice {
  return {
    externalId: "E1-1", announcementId: "E1", title: "가짜 시흥 청년 행복주택 모집", sidoCode: "41", sigunguCode: "41390",
    supplyType: "행복주택", monthlyRent: 300000, announcedOn: "2026-11-01", applyStart: "2026-11-20", applyEnd: "2026-12-10",
    url: null, complexName: "가짜단지", statusName: null, beforeAnnouncementId: null, ...over,
  };
}

const BEFORE: TrackedValues = { applyStart: "2026-11-20", applyEnd: "2026-12-10", monthlyRent: 300000, supplyType: "행복주택" };

/** 지금부터 48시간 예보. 기온·습도를 시각마다 같게 둔다 */
function forecast(temperature: number, humidity: number): HourlyForecast[] {
  const start = Date.parse(EVAL_NOW);
  return Array.from({ length: 48 }, (_, i) => ({ forecastAt: new Date(start + (i + 1) * 3_600_000).toISOString(), temperature, humidity, precipitationType: 0 }));
}

const RECENT = "2026-11-17T21:00:00+09:00";

export const EVAL_CASES: EvalCase[] = [
  { kind: "notice", id: "N-01", title: "팔로우한 공고의 마감일이 바뀜", basis: "사건 기준 (가) 접수 기간 바뀜", expected: true,
    notice: notice({ applyEnd: "2026-12-20" }), previous: BEFORE, followed: true, condition: CONDITION },
  { kind: "notice", id: "N-02", title: "팔로우한 공고의 월세가 바뀜(상한 안)", basis: "사건 기준 (가) 월 임대료 바뀜", expected: true,
    notice: notice({ monthlyRent: 320000 }), previous: BEFORE, followed: true, condition: CONDITION },
  { kind: "notice", id: "N-03", title: "팔로우하지 않은 공고의 마감일이 바뀜", basis: "사건 아님: 팔로우하지 않은 공고의 변화", expected: false,
    notice: notice({ applyEnd: "2026-12-20" }), previous: BEFORE, followed: false, condition: CONDITION },
  { kind: "notice", id: "N-04", title: "처음 보이는 맞는 공고", basis: "사건 아님: 처음 보이는 공고는 맞는 공고 목록", expected: false,
    notice: notice({ externalId: "E9-1", announcementId: "E9" }), previous: null, followed: true, condition: CONDITION },
  { kind: "notice", id: "N-05", title: "팔로우한 공고, 바뀐 것 없음", basis: "사건 아님: 바뀐 것 없음", expected: false,
    notice: notice({}), previous: BEFORE, followed: true, condition: CONDITION },
  { kind: "notice", id: "N-06", title: "팔로우한 공고의 정정공고", basis: "사건 기준 (나) 정정공고", expected: true,
    notice: notice({ externalId: "E2-1", announcementId: "E2", statusName: "정정공고", beforeAnnouncementId: "E1" }), previous: null, followed: true,
    seenAnnouncementIds: ["E1"], condition: CONDITION },
  { kind: "notice", id: "N-07", title: "팔로우한 단지에 추가모집 공고", basis: "사건 기준 (나) 같은 단지 추가모집", expected: true,
    notice: notice({ externalId: "E3-1", announcementId: "E3", title: "가짜 시흥 청년 행복주택 추가모집" }), previous: null, followed: true,
    seenComplexKeys: ["41390:가짜단지"], condition: CONDITION },
  { kind: "notice", id: "N-08", title: "바뀐 월세가 내 상한을 넘음", basis: "사건 아님: 조건 밖", expected: false,
    notice: notice({ monthlyRent: 600000 }), previous: BEFORE, followed: true, condition: CONDITION },
  { kind: "notice", id: "N-09", title: "다른 시도 공고의 변화", basis: "사건 아님: 조건 밖(지역)", expected: false,
    notice: notice({ sidoCode: "26", sigunguCode: "26350", applyEnd: "2026-12-20" }), previous: BEFORE, followed: true, condition: CONDITION },
  { kind: "notice", id: "N-10", title: "마감이 지난 공고의 변화", basis: "사건 아님: 마감 지난 공고", expected: false,
    notice: notice({ applyStart: "2026-10-01", applyEnd: "2026-11-10", monthlyRent: 320000 }), previous: { ...BEFORE, applyStart: "2026-10-01", applyEnd: "2026-11-10" }, followed: true, condition: CONDITION },

  { kind: "humidity", id: "H-01", title: "홑유리, 실내 20°C·60%, 바깥 -5°C", basis: "사건 기준 (가) 표면 온도 ≤ 이슬점+1°C (spec 004 SC-002 예시)", expected: true,
    measurement: { temperatureC: 20, humidityPct: 60, measuredAt: RECENT }, windowType: "single", forecast: forecast(-5, 50) },
  { kind: "humidity", id: "H-02", title: "이중유리, 실내 22°C·40%, 바깥 5°C", basis: "사건 아님: 기준에 못 미침", expected: false,
    measurement: { temperatureC: 22, humidityPct: 40, measuredAt: RECENT }, windowType: "double", forecast: forecast(5, 50) },
  { kind: "humidity", id: "H-03", title: "실내 습도 75%, 예보 습한 날 48시간", basis: "사건 기준 (나) 실내 습도 기준 이상 + 습한 날 이어짐", expected: true,
    measurement: { temperatureC: 24, humidityPct: 75, measuredAt: RECENT }, windowType: "double", forecast: forecast(15, 90) },
  { kind: "humidity", id: "H-04", title: "실내 습도 75%, 예보 건조", basis: "사건 아님: 습한 날이 이어지지 않음", expected: false,
    measurement: { temperatureC: 24, humidityPct: 75, measuredAt: RECENT }, windowType: "double", forecast: forecast(15, 40) },
  { kind: "humidity", id: "H-05", title: "측정값 없음", basis: "사건 아님: 측정값 없으면 판단하지 않음(spec 003 FR-010)", expected: false,
    measurement: null, windowType: "single", forecast: forecast(-5, 50) },
  { kind: "humidity", id: "H-06", title: "측정값이 8일 전", basis: "사건 아님: 측정값 7일 지나면 판단하지 않음", expected: false,
    measurement: { temperatureC: 20, humidityPct: 60, measuredAt: "2026-11-10T09:00:00+09:00" }, windowType: "single", forecast: forecast(-5, 50) },
  { kind: "humidity", id: "H-07", title: "창 종류 모름, 실내 20°C·60%, 바깥 -5°C", basis: "사건 기준 (가): 모름은 홑유리로 본다(spec 003 Q16)", expected: true,
    measurement: { temperatureC: 20, humidityPct: 60, measuredAt: RECENT }, windowType: "unknown", forecast: forecast(-5, 50) },
  { kind: "humidity", id: "H-08", title: "예보를 못 받음", basis: "사건 아님: 예보 없으면 판단하지 않음", expected: false,
    measurement: { temperatureC: 20, humidityPct: 60, measuredAt: RECENT }, windowType: "single", forecast: [] },
];
