import { describe, expect, it } from "vitest";
import { MOVE_IN_ITEMS, checkedCount, parseChecklist, parseChecklistForm } from "@/incident/move-in-checklist";

// spec 019 FR-001, 경계 E2
describe("MOVE_IN_ITEMS", () => {
  it("뼈대 때의 7개 항목을 그대로 쓰고 키가 겹치지 않는다", () => {
    expect(MOVE_IN_ITEMS).toHaveLength(7);
    expect(new Set(MOVE_IN_ITEMS.map((i) => i.key)).size).toBe(7);
    expect(MOVE_IN_ITEMS[0].label).toBe("채광: 낮에 불을 끄고도 방이 밝은가");
  });
});

describe("parseChecklist (DB에서 읽은 값)", () => {
  it("목록에 있는 키의 true만 남긴다(E2: 옛 키·true가 아닌 값은 버림)", () => {
    expect(parseChecklist({ light: true, noise: false, gone: true, mold: "yes" })).toEqual({ light: true });
  });
  it("객체가 아니면 빈 점검", () => {
    expect(parseChecklist(null)).toEqual({});
    expect(parseChecklist([1, 2])).toEqual({});
  });
  it("checkedCount", () => {
    expect(checkedCount({ light: true, mold: true })).toBe(2);
  });
});

describe("parseChecklistForm (저장할 값)", () => {
  it("체크한 키 중 목록에 있는 것만, 메모는 앞뒤 공백을 지우고 비면 null", () => {
    expect(parseChecklistForm({ checked: ["light", "window", "hack"], note: "  창 북향  " })).toEqual({ ok: true, checklist: { light: true, window: true }, note: "창 북향" });
    expect(parseChecklistForm({ checked: [], note: "   " })).toEqual({ ok: true, checklist: {}, note: null });
  });
  it("E2: 메모가 500자를 넘으면 거절", () => {
    expect(parseChecklistForm({ checked: [], note: "가".repeat(501) })).toEqual({ ok: false, error: "메모는 500자 안으로 줄여 주세요." });
  });
});
