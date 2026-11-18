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
