import { describe, expect, it } from "vitest";
import { BUNDLE_THRESHOLD } from "@/incident/notify";
import { bundleDevices, parseSubscription, pushOutcome, pushPayloads, selectToPush, settleIncident, type PushDevice } from "@/incident/web-push";
import { makeNotice } from "./fixtures";

// spec 021 FR-003~005: 웹 푸시는 슬랙 알림과 같은 조건·같은 내용
const facts = {
  ...makeNotice({ title: "가짜 행복주택 모집", applyEnd: "2026-12-07" }),
  change: { kind: "changed" as const, changes: [{ field: "applyEnd" as const, before: "2026-11-30", after: "2026-12-07" }], relatedAnnouncementId: null },
};
const humidity = {
  kind: "humidity" as const, title: "결로 위험: 11월 19일 02시", dueDate: "2026-11-18", riskAt: "2026-11-18T17:00:00.000Z",
  windowStart: "2026-11-18T17:00:00.000Z", condition: "surface" as const, windowType: "unknown" as const, sigunguCode: "26350",
  measurement: { temperatureC: 20, humidityPct: 60, measuredAt: "2026-11-17T12:00:00.000Z" },
  outdoorC: -5, outdoorHumidity: 60, surfaceC: 1.16, dewPointC: 12.04, marginC: -10.88, forecastHours: 48, humidHours: 0,
};
const base = "https://homefit.test";

describe("pushPayloads (FR-003, E8)", () => {
  it("슬랙 글의 첫 줄이 제목, 가운데가 본문, 여는 주소는 사건 상세", () => {
    const [push] = pushPayloads([{ incidentId: "i-1", facts }], base);
    expect(push.incidentIds).toEqual(["i-1"]);
    expect(push.payload.title).toBe("[HomeFit] 주거 기회: 가짜 행복주택 모집");
    expect(push.payload.body).toContain("접수 마감 2026-11-30 → 2026-12-07");
    expect(push.payload.body).toContain("마감 2026-12-07");
    expect(push.payload.body).not.toContain("https://");
    expect(push.payload.url).toBe("https://homefit.test/incidents/i-1");
  });

  it("결로 위험도 같은 내용, 시군구는 넣지 않는다", () => {
    const [push] = pushPayloads([{ incidentId: "h-1", facts: humidity }], base);
    expect(push.payload.title).toBe("[HomeFit] 위험: 결로 위험: 11월 19일 02시");
    expect(push.payload.body).toBe("창 표면 1.2°C(추정) · 이슬점 12.0°C · 바깥 -5°C\n할 날 2026-11-18 · 환기·제습 대응 계획을 확인해 주세요");
    expect(JSON.stringify(push.payload)).not.toContain("26350");
  });

  it("6개 이상이면 하나로 묶고 사건 목록을 연다", () => {
    const six = Array.from({ length: BUNDLE_THRESHOLD }, (_, i) => ({ incidentId: `i-${i}`, facts }));
    const pushes = pushPayloads(six, base);
    expect(pushes).toHaveLength(1);
    expect(pushes[0].incidentIds).toHaveLength(6);
    expect(pushes[0].payload.title).toBe("[HomeFit] 새 위험·기회 알림 6건이 생겼습니다. 홈에서 확인해 주세요.");
    expect(pushes[0].payload.url).toBe("https://homefit.test/incidents");
  });
});

describe("selectToPush (FR-004, SC-003, SC-004, E1)", () => {
  const incident = (id: string, userId = "u1", detectedAt = "2026-11-20T01:00:00Z") => ({ incidentId: id, userId, detectedAt, facts });
  const device = (id: string, userId = "u1", createdAt = "2026-11-20T00:00:00Z"): PushDevice => ({ id, userId, createdAt });

  it("켠 기기가 있는 사람의 사건만, 그 사람 기기 모두에", () => {
    const picked = selectToPush({ incidents: [incident("a"), incident("b", "u2")], devices: [device("d1"), device("d2")], records: new Map() });
    expect(picked).toEqual([{ ...incident("a"), deviceIds: ["d1", "d2"] }]);
  });

  it("기기를 켜기 전에 생긴 사건은 그 기기로 보내지 않는다", () => {
    const later = device("d2", "u1", "2026-11-20T02:00:00Z");
    expect(selectToPush({ incidents: [incident("a")], devices: [device("d1"), later], records: new Map() })[0].deviceIds).toEqual(["d1"]);
    expect(selectToPush({ incidents: [incident("a")], devices: [later], records: new Map() })).toEqual([]);
  });

  it("보냄은 다시 안 보내고, 실패는 한 번만 다시", () => {
    const records = new Map([
      ["sent", { status: "sent", attempts: 1 }],
      ["once", { status: "failed", attempts: 1 }],
      ["twice", { status: "failed", attempts: 2 }],
    ]);
    const picked = selectToPush({ incidents: [incident("sent"), incident("once"), incident("twice")], devices: [device("d1")], records });
    expect(picked.map((p) => p.incidentId)).toEqual(["once"]);
  });
});

describe("pushOutcome (FR-005, E4, E5)", () => {
  it("2xx는 보냄, 404·410은 기기 지움, 그 밖은 실패", () => {
    expect(pushOutcome(201)).toBe("sent");
    expect(pushOutcome(404)).toBe("gone");
    expect(pushOutcome(410)).toBe("gone");
    expect(pushOutcome(429)).toBe("failed");
    expect(pushOutcome(500)).toBe("failed");
    expect(pushOutcome(null)).toBe("failed");
  });
});

describe("settleIncident (E1)", () => {
  it("기기 하나라도 보냈으면 보냄", () => {
    expect(settleIncident(["gone", "sent"])).toBe("sent");
    expect(settleIncident(["failed", "gone"])).toBe("failed");
    expect(settleIncident([])).toBe("failed");
  });
});

// ponytail-review 2026-11-20 4번: 묶음은 그 안 모든 사건보다 먼저 켠 기기에만(FR-004 "켜기 전 사건은 그 기기로 보내지 않음")
describe("bundleDevices", () => {
  it("묶음 안 사건 모두에 해당하는 기기만", () => {
    expect(bundleDevices([["phone", "pc"], ["phone"]])).toEqual(["phone"]);
    expect(bundleDevices([["phone", "pc"]])).toEqual(["phone", "pc"]);
    expect(bundleDevices([])).toEqual([]);
  });
});

// spec 021 FR-001: 브라우저가 준 구독 값 검사(입력 경계)
describe("parseSubscription", () => {
  const good = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "BNcR_x-1", auth: "tBHI-2_x" } };
  it("https 주소와 열쇠 둘이 있으면 받는다", () => {
    expect(parseSubscription(good)).toEqual({ ok: true, value: { endpoint: good.endpoint, p256dh: "BNcR_x-1", auth: "tBHI-2_x" } });
  });
  it("모양이 다르면 거절(http 주소, 열쇠 없음, 이상한 글자, 너무 김)", () => {
    for (const bad of [
      null, "x", { ...good, endpoint: "http://push.test/a" }, { endpoint: good.endpoint }, { ...good, keys: { p256dh: "a b", auth: "c" } },
      { ...good, endpoint: `https://fcm.googleapis.com/${"a".repeat(2100)}` },
    ]) {
      expect(parseSubscription(bad)).toEqual({ ok: false, message: "이 브라우저의 알림 정보를 읽지 못했습니다. 페이지를 새로 고친 뒤 다시 켜 주세요." });
    }
  });
});

// 3·4단계 리뷰 1번(2026-11-20): 서버가 아무 주소로나 요청을 보내지 않게 실제 브라우저 푸시 서비스만 받는다
describe("parseSubscription 받을 주소 호스트", () => {
  const keys = { p256dh: "BNcR_x-1", auth: "tBHI-2_x" };
  it("크롬·파이어폭스·엣지·사파리 푸시 서비스는 받는다", () => {
    for (const endpoint of [
      "https://fcm.googleapis.com/fcm/send/abc", "https://updates.push.services.mozilla.com/wpush/v2/abc",
      "https://wns2-bn3p.notify.windows.com/w/?token=abc", "https://web.push.apple.com/QGx",
    ]) expect(parseSubscription({ endpoint, keys }).ok).toBe(true);
  });
  it("그 밖의 호스트는 거절(내부 주소, 비슷한 이름)", () => {
    for (const endpoint of [
      "https://10.0.0.5/push", "https://evil.example.com/fcm.googleapis.com", "https://fcm.googleapis.com.evil.com/x",
      "https://notpush.apple.com.evil/x", "https://localhost/x",
    ]) expect(parseSubscription({ endpoint, keys }).ok).toBe(false);
  });
});
