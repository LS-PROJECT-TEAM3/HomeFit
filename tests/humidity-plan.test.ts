import { describe, expect, it } from "vitest";
import type { HumidityFacts } from "@/incident/humidity-detect";
import { buildHumidityPrompt, composeHumidityChecklist, HUMIDITY_PLAN_SYSTEM_PROMPT, redateChecklist } from "@/incident/humidity-plan";

// FR-007 (spec 003): 대응 계획 AI 초안. 근거는 측정값·예보·추정값만, 날짜는 코드가 붙인다
const facts: HumidityFacts = {
  kind: "humidity", title: "결로 위험: 11월 19일 02시", dueDate: "2026-11-18", riskAt: "2026-11-18T17:00:00.000Z",
  windowStart: "2026-11-18T17:00:00.000Z", condition: "surface", windowType: "unknown", sigunguCode: "26350",
  measurement: { temperatureC: 20, humidityPct: 60, measuredAt: "2026-11-17T12:00:00.000Z" },
  outdoorC: -5, outdoorHumidity: 60, surfaceC: 1.16, dewPointC: 12.0, marginC: -10.84, forecastHours: 48, humidHours: 0,
};

describe("buildHumidityPrompt", () => {
  it("측정값·예보·추정값 숫자를 넣고, 창 '모름'은 홑유리로 계산했다고 밝힌다", () => {
    const prompt = buildHumidityPrompt(facts);
    expect(prompt).toContain("실내 온도: 20°C");
    expect(prompt).toContain("실내 습도: 60%");
    expect(prompt).toContain("가장 위험한 시각: 11월 19일 02시");
    expect(prompt).toContain("그때 바깥 기온: -5°C");
    expect(prompt).toContain("창 표면 온도(추정): 1.2°C");
    expect(prompt).toContain("이슬점(추정): 12.0°C");
    expect(prompt).toContain("창 종류: 모름(홑유리로 계산)");
  });

  it("사용자를 알 수 있는 값(시군구 코드, 집 ID)은 넣지 않는다 (spec 002 Q23)", () => {
    const prompt = buildHumidityPrompt(facts);
    expect(prompt).not.toContain("26350");
    expect(prompt).not.toContain("home");
  });

  it("습도 조건이면 습한 시각 수를 알려 준다", () => {
    expect(buildHumidityPrompt({ ...facts, condition: "humidity", humidHours: 14 })).toContain("앞으로 48시간 중 습하거나 비·눈 오는 시각: 14시간");
  });

  it("지시문은 날짜를 쓰지 말고, 누수·하자를 판단하지 말라고 한다", () => {
    expect(HUMIDITY_PLAN_SYSTEM_PROMPT).toContain("날짜는 쓰지 않는다");
    expect(HUMIDITY_PLAN_SYSTEM_PROMPT).toContain("누수");
  });
});

describe("composeHumidityChecklist", () => {
  it("AI 할 일마다 마감일을 코드가 붙인다", () => {
    expect(composeHumidityChecklist(["창 열고 환기하기", "제습기 켜기"], "2026-11-18")).toEqual([
      { label: "창 열고 환기하기", dueOn: "2026-11-18" },
      { label: "제습기 켜기", dueOn: "2026-11-18" },
    ]);
  });
});

describe("redateChecklist (4단계 리뷰 1)", () => {
  it("사건이 갱신되면 할 일 글은 그대로 두고 날짜만 새 마감일로", () => {
    const ai = [{ label: "가구를 벽에서 떼기", dueOn: "2026-11-17" }, { label: "창 닦기", dueOn: "2026-11-17" }];
    expect(redateChecklist(ai, "2026-11-18")).toEqual([
      { label: "가구를 벽에서 떼기", dueOn: "2026-11-18" },
      { label: "창 닦기", dueOn: "2026-11-18" },
    ]);
  });

  it("목록 모양이 이상하면 빈 목록(부르는 쪽이 기본 할 일을 쓴다)", () => {
    expect(redateChecklist(null, "2026-11-18")).toEqual([]);
    expect(redateChecklist([{ nope: 1 }], "2026-11-18")).toEqual([]);
  });
});
