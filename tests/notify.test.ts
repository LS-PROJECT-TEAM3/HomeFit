import { describe, expect, it } from "vitest";
import { maskSecrets } from "@/watch/mask";
import {
  BUNDLE_THRESHOLD,
  buildMessages,
  normalizeSlackEmail,
  readLookupResult,
  selectToNotify,
  type NotifySetting,
} from "@/incident/notify";
import { makeNotice } from "./fixtures";

// FR-018 (spec 001 v0.3)
describe("normalizeSlackEmail", () => {
  it("이메일 모양이면 빈칸을 지우고 받는다", () => {
    expect(normalizeSlackEmail("  name@example.com ")).toEqual({ ok: true, email: "name@example.com" });
  });

  it("모양이 아니거나 비면 안내 문구", () => {
    for (const bad of ["abc", "", "a@b", "a b@c.com"]) {
      expect(normalizeSlackEmail(bad)).toEqual({ ok: false, message: "이메일 형식이 아닙니다. 예: name@example.com" });
    }
  });
});

describe("readLookupResult", () => {
  it("찾으면 슬랙 사람 ID", () => {
    expect(readLookupResult({ ok: true, user: { id: "U123" } })).toEqual({ ok: true, slackUserId: "U123" });
  });

  it("없는 사람", () => {
    expect(readLookupResult({ ok: false, error: "users_not_found" })).toEqual({
      ok: false, message: "이 이메일로 팀 슬랙에서 사람을 찾지 못했습니다. 팀 슬랙에 가입한 이메일인지 확인해 주세요.",
    });
  });

  it("토큰·권한 문제는 '아직 쓸 수 없습니다'", () => {
    for (const error of ["invalid_auth", "not_authed", "missing_scope", "account_inactive"]) {
      expect(readLookupResult({ ok: false, error })).toEqual({ ok: false, message: "슬랙 알림을 아직 쓸 수 없습니다. 관리자에게 문의해 주세요." });
    }
  });

  it("그 밖의 실패", () => {
    expect(readLookupResult({ ok: false, error: "ratelimited" })).toMatchObject({ ok: false });
    expect(readLookupResult("이상한 값")).toMatchObject({ ok: false });
  });
});

// FR-019 (spec 001 v0.3)
const facts = {
  ...makeNotice({ title: "가짜 행복주택 모집", applyEnd: "2026-12-07" }),
  change: { kind: "changed" as const, changes: [{ field: "applyEnd" as const, before: "2026-11-30", after: "2026-12-07" }], relatedAnnouncementId: null },
};

describe("buildMessages", () => {
  const one = [{ incidentId: "i-1", facts }];

  it("message: 제목·전 → 후·마감·상세 링크만", () => {
    const [message] = buildMessages(one, "https://homefit.test");
    expect(message.text).toMatch(/^\[HomeFit\] 주거 기회: /);
    expect(message.incidentIds).toEqual(["i-1"]);
    expect(message.text).toContain("가짜 행복주택 모집");
    expect(message.text).toContain("접수 마감 2026-11-30 → 2026-12-07");
    expect(message.text).toContain("마감 2026-12-07");
    expect(message.text).toContain("https://homefit.test/incidents/i-1");
  });

  it("message: 이름·조건·AI 요약을 넣지 않는다(facts에 없는 값은 쓰지 않음)", () => {
    const [message] = buildMessages(one, "https://homefit.test");
    expect(message.text).not.toMatch(/요약|상한|나이|@/);
  });

  it("bundle: 5건은 5개, 6건 이상은 1개로 묶는다 (Q20)", () => {
    const five = Array.from({ length: 5 }, (_, i) => ({ incidentId: `i-${i}`, facts }));
    const six = Array.from({ length: BUNDLE_THRESHOLD }, (_, i) => ({ incidentId: `i-${i}`, facts }));
    expect(buildMessages(five, "https://homefit.test")).toHaveLength(5);
    const bundled = buildMessages(six, "https://homefit.test");
    expect(bundled).toHaveLength(1);
    expect(bundled[0].incidentIds).toHaveLength(6);
    expect(bundled[0].text).toContain("위험·기회 알림 6건"); // spec 003 FR-012 화면 이름
    expect(bundled[0].text).toContain("https://homefit.test/incidents");
  });
});

describe("selectToNotify", () => {
  const on: NotifySetting = { enabled: true, slackUserId: "U1", enabledAt: "2026-11-17T00:00:00Z" };
  const incident = (id: string, userId = "u1", detectedAt = "2026-11-17T01:00:00Z") => ({ incidentId: id, userId, detectedAt, facts });

  it("retry: 켠 사람의 새 사건은 보낸다, 끈 사람은 안 보낸다", () => {
    const settings = new Map([["u1", on], ["u2", { ...on, enabled: false }]]);
    const picked = selectToNotify({ incidents: [incident("a"), incident("b", "u2")], settings, records: new Map() });
    expect(picked.map((p) => p.incidentId)).toEqual(["a"]);
  });

  it("retry: 켜기 전에 생긴 사건은 보내지 않는다", () => {
    const settings = new Map([["u1", on]]);
    expect(selectToNotify({ incidents: [incident("a", "u1", "2026-11-16T23:00:00Z")], settings, records: new Map() })).toEqual([]);
  });

  it("retry: 보낸 사건은 다시 안 보내고, 실패 1번은 다시, 2번이면 그만", () => {
    const settings = new Map([["u1", on]]);
    const records = new Map([
      ["sent", { status: "sent", attempts: 1 }],
      ["failed1", { status: "failed", attempts: 1 }],
      ["failed2", { status: "failed", attempts: 2 }],
    ]);
    const picked = selectToNotify({ incidents: [incident("sent"), incident("failed1"), incident("failed2")], settings, records });
    expect(picked.map((p) => p.incidentId)).toEqual(["failed1"]);
  });

  it("슬랙 사람을 못 찾은 설정은 보내지 않는다", () => {
    const settings = new Map([["u1", { ...on, slackUserId: null }]]);
    expect(selectToNotify({ incidents: [incident("a")], settings, records: new Map() })).toEqual([]);
  });
});

describe("mask.secrets 봇 토큰", () => {
  it("xoxb- 토큰은 목록에 없어도 가린다", () => {
    expect(maskSecrets("slack error token=xoxb-123-456-abcDEF failed", [])).toBe("slack error token=*** failed");
  });
});

// spec 003 FR-009: 습도·결로 위험 슬랙 알림. 측정값·추정 숫자와 할 날·링크만, 집 위치(시군구)는 넣지 않는다
describe("buildMessages 습도·결로", () => {
  const humidity = {
    kind: "humidity" as const, title: "결로 위험: 11월 19일 02시", dueDate: "2026-11-18", riskAt: "2026-11-18T17:00:00.000Z",
    windowStart: "2026-11-18T17:00:00.000Z", condition: "surface" as const, windowType: "unknown" as const, sigunguCode: "26350",
    measurement: { temperatureC: 20, humidityPct: 60, measuredAt: "2026-11-17T12:00:00.000Z" },
    outdoorC: -5, outdoorHumidity: 60, surfaceC: 1.16, dewPointC: 12.04, marginC: -10.88, forecastHours: 48, humidHours: 0,
  };

  it("위험: 제목, 추정 숫자, 할 날, 링크", () => {
    const [message] = buildMessages([{ incidentId: "h-1", facts: humidity }], "https://homefit.test");
    expect(message.text).toBe([
      "[HomeFit] 위험: 결로 위험: 11월 19일 02시",
      "창 표면 1.2°C(추정) · 이슬점 12.0°C · 바깥 -5°C",
      "할 날 2026-11-18 · 환기·제습 대응 계획을 확인해 주세요",
      "https://homefit.test/incidents/h-1",
    ].join("\n"));
    expect(message.text).not.toContain("26350");
  });
});
