import { describe, expect, it, vi } from "vitest";
import { runWebPush, sendToDevice, type WebPushDeps, type DeviceWithKeys, type PushRecordRow } from "@/incident/web-push.server";
import { makeNotice } from "./fixtures";

// spec 021 FR-003·FR-005, E1·E4·E5: 실제 푸시 서비스·DB 대신 가짜를 끼운다(시험은 실제 API를 부르지 않음)
const facts = {
  ...makeNotice({ title: "가짜 행복주택 모집", applyEnd: "2026-12-07" }),
  change: { kind: "changed" as const, changes: [{ field: "applyEnd" as const, before: "2026-11-30", after: "2026-12-07" }], relatedAnnouncementId: null },
};
const incident = (id: string, userId = "u1") => ({ incidentId: id, userId, detectedAt: "2026-11-20T01:00:00Z", facts });
const device = (id: string, userId = "u1"): DeviceWithKeys => ({ id, userId, createdAt: "2026-11-20T00:00:00Z", endpoint: `https://push.test/${id}`, p256dh: "k", auth: "a" });

function fakeDeps(options: { devices: DeviceWithKeys[]; status: Record<string, number | null>; retries?: { incident: ReturnType<typeof incident>; attempts: number }[] }) {
  const saved: PushRecordRow[] = [];
  const removed: string[] = [];
  const sentTo: string[] = [];
  const deps: WebPushDeps = {
    baseUrl: "https://homefit.test",
    loadRetries: async () => ({
      candidates: (options.retries ?? []).map((r) => r.incident),
      records: new Map((options.retries ?? []).map((r) => [r.incident.incidentId, { status: "failed", attempts: r.attempts }])),
    }),
    loadDevices: async (userIds) => options.devices.filter((d) => userIds.includes(d.userId)),
    send: async (target, payload) => {
      sentTo.push(target.id);
      expect(JSON.parse(payload)).toHaveProperty("url");
      return target.id in options.status ? options.status[target.id] : 201;
    },
    saveRecords: async (rows) => { saved.push(...rows); },
    removeDevice: async (id) => { removed.push(id); },
  };
  return { deps, saved, removed, sentTo };
}

describe("runWebPush", () => {
  it("보내면 사람마다 한 번 '보냄'으로 기록", async () => {
    const { deps, saved } = fakeDeps({ devices: [device("d1")], status: {} });
    const stats = await runWebPush(deps, [incident("a")]);
    expect(saved).toEqual([{ incidentId: "a", userId: "u1", ok: true, error: null, attempts: 1 }]);
    expect(stats).toEqual({ sent: 1, failed: 0, retried: 0, removed: 0 });
  });

  it("실패는 '실패'로 남기고, 지난 실패는 횟수를 올려 한 번 더", async () => {
    const { deps, saved } = fakeDeps({ devices: [device("d1")], status: { d1: 500 }, retries: [{ incident: incident("old"), attempts: 1 }] });
    const stats = await runWebPush(deps, [incident("a")]);
    expect(saved).toContainEqual({ incidentId: "a", userId: "u1", ok: false, error: "push_500", attempts: 1 });
    expect(saved).toContainEqual({ incidentId: "old", userId: "u1", ok: false, error: "push_500", attempts: 2 });
    expect(stats.retried).toBe(1);
  });

  it("410이면 그 기기를 지우고, 다른 기기가 받았으면 보냄(E1·E4)", async () => {
    const { deps, saved, removed } = fakeDeps({ devices: [device("d1"), device("d2")], status: { d1: 410 } });
    const stats = await runWebPush(deps, [incident("a")]);
    expect(removed).toEqual(["d1"]);
    expect(saved[0].ok).toBe(true);
    expect(stats.removed).toBe(1);
  });

  it("푸시 서비스가 응답하지 않으면 이번 수집의 남은 알림은 부르지 않고 실패로(다음 수집에 한 번 더)", async () => {
    const { deps, saved, sentTo } = fakeDeps({ devices: [device("d1"), device("d2", "u2")], status: { d1: null } });
    await runWebPush(deps, [incident("a"), incident("b", "u2")]);
    expect(sentTo).toEqual(["d1"]);
    expect(saved.map((r) => [r.incidentId, r.ok, r.error])).toEqual([["a", false, "push_unreachable"], ["b", false, "push_skipped"]]);
  });

  it("켠 기기가 없으면 아무것도 기록하지 않는다", async () => {
    const { deps, saved, sentTo } = fakeDeps({ devices: [], status: {} });
    expect(await runWebPush(deps, [incident("a")])).toEqual({ sent: 0, failed: 0, retried: 0, removed: 0 });
    expect(saved).toEqual([]);
    expect(sentTo).toEqual([]);
  });
});

// ponytail-review 2026-11-20 1·2·6번
describe("runWebPush 리뷰 반영", () => {
  it("지운 기기에는 같은 수집에서 다시 보내지 않고, 지운 수도 한 번만 센다(2번)", async () => {
    const { deps, sentTo, removed } = fakeDeps({ devices: [device("d1")], status: { d1: 410 } });
    const stats = await runWebPush(deps, [incident("a"), incident("b"), incident("c")]);
    expect(sentTo).toEqual(["d1"]);
    expect(removed).toEqual(["d1"]);
    expect(stats.removed).toBe(1);
  });

  it("기기가 모두 사라지면 다시 보낼 대상에서 뺀다(6번: 횟수를 끝까지)", async () => {
    const { deps, saved } = fakeDeps({ devices: [device("d1")], status: { d1: 410 } });
    await runWebPush(deps, [incident("a")]);
    expect(saved).toEqual([{ incidentId: "a", userId: "u1", ok: false, error: "push_gone", attempts: 2 }]);
  });
});

describe("sendToDevice (1번: 네트워크가 아닌 오류)", () => {
  it("열쇠가 잘못된 기기는 응답 없음(null)이 아니라 실패 코드 0", async () => {
    const keys = (await import("web-push")).default.generateVAPIDKeys();
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", keys.publicKey);
    vi.stubEnv("VAPID_PRIVATE_KEY", keys.privateKey);
    vi.stubEnv("VAPID_SUBJECT", "mailto:test@example.com");
    expect(await sendToDevice({ endpoint: "https://push.test/x", p256dh: "too-short", auth: "a" }, "{}")).toBe(0);
    vi.unstubAllEnvs();
  });
});
