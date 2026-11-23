import { describe, expect, it } from "vitest";
import {
  MOVE_IN_ITEMS, checkCustomLabel, checkedCount, emptyChecklist, parseChecklist, parseChecklistForm, toStored, totalCount, checklistSnapshot, type MoveInChecklist,
} from "@/incident/move-in-checklist";

// spec 019 FR-001·E2, spec 024 FR-001~006·E1~E6 (qa C-2401~2405)
describe("MOVE_IN_ITEMS", () => {
  it("뼈대 때의 7개 항목을 앞에 그대로 두고 키가 겹치지 않는다", () => {
    expect(MOVE_IN_ITEMS[0].label).toBe("채광: 낮에 불을 끄고도 방이 밝은가");
    expect(MOVE_IN_ITEMS.slice(0, 7).map((i) => i.key)).toEqual(["light", "noise", "smell", "mold", "water_pressure", "maintenance_fee", "window"]);
    expect(new Set(MOVE_IN_ITEMS.map((i) => i.key)).size).toBe(MOVE_IN_ITEMS.length);
  });
  // spec 024 FR-007·SC-005 (qa C-2410)
  it("FR-007: 기본 항목 12개, 더한 5개는 배수·난방·보일러·전기·콘센트·방범·누수 흔적", () => {
    expect(MOVE_IN_ITEMS).toHaveLength(12);
    expect(MOVE_IN_ITEMS.slice(7).map((i) => i.label.split(":")[0])).toEqual(["배수", "난방·보일러", "전기·콘센트", "방범", "누수 흔적"]);
  });
  it("FR-007: 예전 7개 체크는 그대로, 새 항목은 확인 안 함으로 시작", () => {
    const old = parseChecklist({ light: true, window: true });
    expect(old.checked).toEqual({ light: true, window: true });
    expect(checkedCount(old)).toBe(2);
    expect(totalCount(old)).toBe(12);
  });
});

const parking = { id: "abc123", label: "주차 자리", checked: true, note: "지하 1대" };

describe("parseChecklist (DB에서 읽은 값)", () => {
  it("FR-005: 예전 값(키 → true)을 그대로 읽는다", () => {
    expect(parseChecklist({ light: true, mold: true })).toEqual({ checked: { light: true, mold: true }, notes: {}, custom: [] });
  });
  it("새 모양(항목 메모, 내 항목)을 읽는다", () => {
    expect(parseChecklist({ noise: true, notes: { noise: "차 소리" }, custom: [parking] }))
      .toEqual({ checked: { noise: true }, notes: { noise: "차 소리" }, custom: [parking] });
  });
  it("E5: 모르는 키, true가 아닌 체크, 모르는 키의 메모, 모양이 틀린 내 항목은 버린다", () => {
    const raw = {
      light: true, noise: false, gone: true, mold: "yes",
      notes: { light: "밝음", gone: "x", noise: 3, smell: "가".repeat(201) },
      custom: [parking, { id: "!!", label: "x", checked: true, note: "" }, { id: "zzz999", label: "", checked: false, note: "" }, { id: "abc123", label: "중복 id", checked: false, note: "" }, "엉뚱함"],
    };
    expect(parseChecklist(raw)).toEqual({ checked: { light: true }, notes: { light: "밝음" }, custom: [parking] });
  });
  it("객체가 아니면 빈 점검", () => {
    expect(parseChecklist(null)).toEqual(emptyChecklist());
    expect(parseChecklist([1, 2])).toEqual(emptyChecklist());
  });
  it("내 항목은 10개까지만 읽는다", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ id: `item0${String(i).padStart(2, "0")}`, label: `항목 ${i}`, checked: false, note: "" }));
    expect(parseChecklist({ custom: many }).custom).toHaveLength(10);
  });
});

describe("toStored (저장할 모양)", () => {
  it("메모·내 항목이 없으면 예전과 같은 모양", () => {
    expect(toStored({ checked: { light: true }, notes: {}, custom: [] })).toEqual({ light: true });
  });
  it("빈 메모는 빼고, 새 모양으로", () => {
    expect(toStored({ checked: { noise: true }, notes: { noise: "차 소리", light: "  " }, custom: [parking] }))
      .toEqual({ noise: true, notes: { noise: "차 소리" }, custom: [parking] });
  });
  it("E6: 지운 내 항목은 체크·메모와 함께 저장 값에서 사라진다", () => {
    const after = { checked: {}, notes: {}, custom: [] };
    expect(JSON.stringify(toStored(after))).not.toContain("주차");
  });
});

describe("FR-006 확인 수", () => {
  it("기본 2 + 내 항목 1 체크, 전체 12 + 내 항목 2", () => {
    const list: MoveInChecklist = { checked: { light: true, mold: true }, notes: {}, custom: [parking, { ...parking, id: "def456", label: "엘리베이터", checked: false }] };
    expect(checkedCount(list)).toBe(3);
    expect(totalCount(list)).toBe(14);
  });
});

describe("checkCustomLabel (내 항목 이름, E1~E3)", () => {
  const existing = ["주차 자리"];
  it("E1: 비었거나 공백뿐이면 거절", () => {
    expect(checkCustomLabel("   ", existing)).toBe("항목 이름을 적어 주세요.");
  });
  it("E2: 40자 넘으면 거절, 40자는 통과", () => {
    expect(checkCustomLabel("가".repeat(41), [])).toBe("항목 이름은 40자 안으로 줄여 주세요.");
    expect(checkCustomLabel("가".repeat(40), [])).toBeNull();
  });
  it("E2: 이미 10개면 더 못 더함", () => {
    expect(checkCustomLabel("새 항목", Array.from({ length: 10 }, (_, i) => `항목 ${i}`))).toBe("내 항목은 집마다 10개까지 더할 수 있어요.");
  });
  it("E3: 같은 이름(앞뒤 공백 무시)이나 기본 항목 제목과 같으면 거절", () => {
    expect(checkCustomLabel("  주차 자리 ", existing)).toBe("이미 있는 항목이에요. 다른 이름을 적어 주세요.");
    expect(checkCustomLabel("소음", existing)).toBe("이미 있는 항목이에요. 다른 이름을 적어 주세요.");
    expect(checkCustomLabel("배수", existing)).toBe("이미 있는 항목이에요. 다른 이름을 적어 주세요.");
  });
  it("정상 이름은 null", () => {
    expect(checkCustomLabel("엘리베이터", existing)).toBeNull();
  });
});

describe("parseChecklistForm (화면이 보낸 값)", () => {
  const form = (stored: unknown, note = "") => parseChecklistForm({ checklist: JSON.stringify(stored), note });
  it("저장 모양을 검사해 그대로, 집 메모는 앞뒤 공백을 지우고 비면 null", () => {
    expect(form({ light: true, notes: { light: "밝음" }, custom: [parking] }, "  창 북향  "))
      .toEqual({ ok: true, checklist: { checked: { light: true }, notes: { light: "밝음" }, custom: [parking] }, note: "창 북향" });
    expect(form({}, "   ")).toEqual({ ok: true, checklist: emptyChecklist(), note: null });
  });
  it("모르는 기본 키 체크는 버린다", () => {
    expect(form({ light: true, hack: true })).toMatchObject({ ok: true, checklist: { checked: { light: true } } });
  });
  it("E4: 항목 메모가 200자를 넘으면 어느 항목인지 알리며 거절(200자는 통과)", () => {
    expect(form({ notes: { noise: "가".repeat(201) } })).toEqual({ ok: false, error: "\"소음\" 메모는 200자 안으로 줄여 주세요." });
    expect(form({ custom: [{ ...parking, note: "가".repeat(201) }] })).toEqual({ ok: false, error: "\"주차 자리\" 메모는 200자 안으로 줄여 주세요." });
    expect(form({ notes: { noise: "가".repeat(200) } })).toMatchObject({ ok: true });
  });
  it("집 메모가 500자를 넘으면 거절", () => {
    expect(form({}, "가".repeat(501))).toEqual({ ok: false, error: "메모는 500자 안으로 줄여 주세요." });
  });
  it("E1~E3: 내 항목 이름이 틀리면 거절", () => {
    expect(form({ custom: [{ ...parking, label: " " }] })).toEqual({ ok: false, error: "항목 이름을 적어 주세요." });
    expect(form({ custom: [parking, { ...parking, id: "def456" }] })).toEqual({ ok: false, error: "이미 있는 항목이에요. 다른 이름을 적어 주세요." });
    const eleven = Array.from({ length: 11 }, (_, i) => ({ ...parking, id: `item0${String(i).padStart(2, "0")}`, label: `항목 ${i}` }));
    expect(form({ custom: eleven })).toEqual({ ok: false, error: "내 항목은 집마다 10개까지 더할 수 있어요." });
  });
  // 1단계 리뷰: 검사는 통과했는데 읽을 때 버려져 조용히 사라지는 경우가 없어야 한다
  it("내 항목 id가 틀리거나 겹치면 저장 전에 거절하고, 앞뒤 공백 뺀 40자 이름은 남는다", () => {
    const reload = "점검 내용을 읽지 못했습니다. 페이지를 새로고침한 뒤 다시 저장해 주세요.";
    expect(form({ custom: [{ ...parking, id: "1b4e28ba-2fa1-11d2-883f-0016d3cca427" }] })).toEqual({ ok: false, error: reload });
    expect(form({ custom: [parking, { ...parking, label: "엘리베이터" }] })).toEqual({ ok: false, error: reload });
    const padded = form({ custom: [{ ...parking, label: `  ${"가".repeat(40)}` }] });
    expect(padded).toMatchObject({ ok: true, checklist: { custom: [{ label: "가".repeat(40) }] } });
  });
  it("JSON이 아니면 새로고침 안내", () => {
    expect(parseChecklistForm({ checklist: "{망가짐", note: "" })).toEqual({ ok: false, error: "점검 내용을 읽지 못했습니다. 페이지를 새로고침한 뒤 다시 저장해 주세요." });
  });
});

// 2단계 리뷰: "저장하지 않은 변경" 판단은 키 순서와 상관없어야 한다
describe("checklistSnapshot", () => {
  it("체크 키 순서가 달라도, 빈 메모가 있어도 같은 값", () => {
    const a: MoveInChecklist = { checked: { mold: true, light: true }, notes: {}, custom: [parking] };
    const b: MoveInChecklist = { checked: { light: true, mold: true }, notes: { noise: "  " }, custom: [parking] };
    expect(checklistSnapshot(a)).toBe(checklistSnapshot(b));
  });
  it("내용이 다르면 다른 값", () => {
    const a: MoveInChecklist = { checked: { light: true }, notes: {}, custom: [] };
    expect(checklistSnapshot(a)).not.toBe(checklistSnapshot({ ...a, notes: { light: "밝음" } }));
    expect(checklistSnapshot(a)).not.toBe(checklistSnapshot({ ...a, custom: [parking] }));
  });
});
