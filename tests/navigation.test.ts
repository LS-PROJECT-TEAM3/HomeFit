import { describe, expect, it } from "vitest";
import { activeMenu, isActivePath, sparklinePoints } from "@/app/_components/navigation";

// spec 022 FR-010: 위쪽 메뉴에서 지금 위치(IA v1.17 네비게이션 모델)
describe("activeMenu", () => {
  it("주 메뉴 4개", () => {
    expect(activeMenu("/")).toBe("home");
    expect(activeMenu("/notices/abc")).toBe("notices");
    expect(activeMenu("/incidents")).toBe("alerts");
    expect(activeMenu("/schedule/1")).toBe("schedule");
  });
  it("청년 주거지원 정책은 맞춤 공고 안 탭이라 맞춤 공고", () => {
    expect(activeMenu("/policy")).toBe("notices");
    expect(activeMenu("/policy/123")).toBe("notices");
  });
  it("집 점검·에너지 분석·AI 도우미는 더보기, 집 비교는 한 칸", () => {
    for (const p of ["/qc", "/energy/heating", "/knowledge/history"]) expect(activeMenu(p)).toBe("more");
    // 사용자 요청(2026-11-22): 집 비교는 더보기에서 꺼내 위쪽 메뉴 한 칸
    expect(activeMenu("/compare")).toBe("compare");
    expect(activeMenu("/compare/cost")).toBe("compare");
  });
  it("설정과 관리자는 이름 메뉴", () => {
    expect(activeMenu("/my/home")).toBe("account");
    expect(activeMenu("/admin/flow")).toBe("account");
  });
  it("메뉴에 없는 화면은 표시하지 않음", () => {
    expect(activeMenu("/onboarding")).toBe(null);
    expect(activeMenu("/compareX")).toBe(null);
  });
});

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
