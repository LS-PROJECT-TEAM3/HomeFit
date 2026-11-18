import { describe, expect, it } from "vitest";
import { buildFlow, sourceStarts } from "@/flow/graph";

// spec 005 FR-003 (PRD FR-23, IA AD_070400_TB·AD_070401_MD): 실행 기록 → 상자·화살표. 미리 그린 그림이 아니라 기록에서 (CUJ-04 MOT)
const step = (step_name: string, status: string, items_in: number | null, items_out: number | null, detail: unknown = null) => ({ step_name, status, items_in, items_out, detail });

describe("buildFlow", () => {
  it("단계를 정해진 순서로 상자로 만들고, 화살표에 앞 상자가 넘긴 건수를 단다", () => {
    const flow = buildFlow([step("detect", "succeeded", 5, 2), step("collect", "succeeded", 1, 5), step("compare", "succeeded", 5, 5)], []);
    expect(flow.boxes.slice(0, 3).map((b) => [b.name, b.label, b.state])).toEqual([
      ["collect", "수집", "succeeded"], ["compare", "비교", "succeeded"], ["detect", "감지", "succeeded"],
    ]);
    expect(flow.arrows[0]).toEqual({ from: "collect", to: "compare", count: 5 });
    expect(flow.arrows[1]).toEqual({ from: "compare", to: "detect", count: 5 });
  });
  it("실패한 뒤의 단계는 '도달 못 함'으로 보이고 화살표 건수는 없다", () => {
    const flow = buildFlow([step("collect", "failed", null, null, { error: "API 실패" })], []);
    expect(flow.boxes[0].stateLabel).toBe("실패");
    expect(flow.boxes[1]).toMatchObject({ name: "compare", state: "not_reached", stateLabel: "도달 못 함" });
    expect(flow.arrows[0].count).toBeNull();
  });
  it("상자 상세는 항목별 글자로, 키 값과 키 모양 글자는 가린다(E5)", () => {
    const secret = "abcd1234secretvalue";
    const flow = buildFlow([step("collect", "failed", null, null, { error: `fail serviceKey=XYZ123&page=1 ${secret}`, token: "xoxb-1-2-abc", count: 3 })], [secret]);
    const rows = flow.boxes[0].details;
    expect(rows).toContainEqual({ label: "count", value: "3" });
    expect(rows[0].label).toBe("오류");
    const text = JSON.stringify(rows);
    expect(text).not.toContain(secret);
    expect(text).not.toContain("XYZ123");
    expect(text).not.toContain("xoxb-1-2-abc");
  });
  it("승인 대기 상자는 waiting 상태 글자", () => {
    expect(buildFlow([step("await_approval", "waiting", null, 2)], []).boxes.find((b) => b.name === "await_approval")?.stateLabel).toBe("승인 대기");
  });
});

describe("sourceStarts", () => {
  it("시작 상자 출처마다 하나, 기록이 없는 출처는 '아직 안 켜짐'(E4)", () => {
    const starts = sourceStarts([{ source_code: "myhome_notice", status: "succeeded" }, { source_code: "myhome_notice", status: "failed" }]);
    expect(starts.map((s) => [s.code, s.state, s.stateLabel])).toEqual([
      ["myhome_notice", "succeeded", "성공"], ["kma_forecast", "off", "아직 안 켜짐"], ["youth_policy", "off", "아직 안 켜짐"], ["rtms_trade", "off", "아직 안 켜짐"],
    ]);
  });
});

// PR #13 리뷰·캡처: 상세 항목이 영어·JSON 그대로 보이던 것, 도는 중인 실행이 "건너뜀"으로 보이던 것
describe("상세 항목 한국어 (PR #13)", () => {
  const detailOf = (detail: unknown) => buildFlow([{ step_name: "detect", status: "succeeded", items_in: 1, items_out: 1, detail }], []).boxes[2].details;
  it("묶인 값(changes)은 JSON이 아니라 이름 붙은 글자로", () => {
    expect(detailOf({ changes: { changed: 3, correction: 0, relaxed: 1 } })).toEqual([{ label: "바뀐 공고 종류", value: "바뀜 3 · 정정공고 0 · 완화·재공고 1" }]);
  });
  it("수집기가 쓰는 이름은 모두 한국어 라벨이 있다", () => {
    const keys = ["skipped", "duplicates", "new", "changed", "reason", "months", "ok", "enough", "too_few", "planned", "area_updates"];
    for (const key of keys) expect(detailOf({ [key]: 1 })[0].label).not.toBe(key);
  });
  it("목록은 쉼표로, 목록 안의 묶음은 이름 붙은 글자로", () => {
    expect(detailOf({ months: ["202610", "202609"] })[0].value).toBe("202610, 202609");
    expect(detailOf({ failed_sigungu: [] })[0].value).toBe("없음");
    expect(detailOf({ failed: [{ key: "11680:apartment", reason: "시간 초과" }] })[0].value).toBe("대상 11680:apartment · 이유 시간 초과");
  });
});

describe("도는 중인 실행 (PR #13)", () => {
  it("시작 상자는 건너뜀이 아니라 실행 중", () => {
    const [myhome] = sourceStarts([{ source_code: "myhome_notice", status: "running" }]);
    expect(myhome).toMatchObject({ state: "running", stateLabel: "실행 중" });
  });
});
