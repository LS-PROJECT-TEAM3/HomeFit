import { describe, expect, it } from "vitest";
import { isActivePath, sparklinePoints } from "@/app/_components/navigation";

// spec 004 v0.2 FR-001: 지금 보는 화면 표시. FR-006: 작은 그래프 점 위치
describe("isActivePath", () => {
  it("홈은 / 에서만", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/qc", "/")).toBe(false);
  });
  it("하위 주소도 같은 메뉴", () => {
    expect(isActivePath("/qc/checklist", "/qc")).toBe(true);
    expect(isActivePath("/incidents/abc", "/incidents")).toBe(true);
  });
  it("이름이 겹치는 다른 주소는 아님", () => {
    expect(isActivePath("/qcx", "/qc")).toBe(false);
    expect(isActivePath("/compare", "/compare/cost")).toBe(false);
  });
});

describe("sparklinePoints", () => {
  it("값을 상자 안 좌표로(위가 큰 값)", () => {
    expect(sparklinePoints([40, 60, 50], { width: 100, height: 20 })).toBe("0,20 50,0 100,10");
  });
  it("값이 하나면 가운데 한 점, 모두 같으면 가운데 줄", () => {
    expect(sparklinePoints([50], { width: 100, height: 20 })).toBe("50,10");
    expect(sparklinePoints([50, 50], { width: 100, height: 20 })).toBe("0,10 100,10");
  });
  it("값이 없으면 빈 글자", () => {
    expect(sparklinePoints([], { width: 100, height: 20 })).toBe("");
  });
});
