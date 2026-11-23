import { describe, expect, it } from "vitest";
import { defectSource, interestHomeSource, policySource, type InterestHomeFacts } from "@/knowledge/chat-sources";
import { rankSources, sourceLabel } from "@/knowledge/chat";
import type { Policy } from "@/watch/youth-policy";

// spec 004 v0.5 FR-007: 챗봇 자료에 청년 주거 정책·관심 주택·하자 기록을 더한다(사용자 결정 2026-11-19)
const policy: Policy = {
  externalId: "P-001", announcementId: "P-001", title: "청년 월세 한시 특별지원", sidoCode: null, sigunguCode: null,
  supplyType: null, monthlyRent: null, announcedOn: null, applyStart: "2026-11-01", applyEnd: "2026-12-31",
  minAge: 19, maxAge: 34, regionCodes: [], agency: "국토교통부", support: "월 최대 20만원, 12개월 지원", description: null, periodKind: "range",
} as unknown as Policy; // 테스트에 필요 없는 칸 일부만 채움

const home: InterestHomeFacts = {
  id: "h1", name: "역세권 오피스텔", housingType: "오피스텔", deposit: 10_000_000, monthlyRent: 550_000, maintenanceFee: 80_000,
  energyCost: null, electricityKwh: null, transitFare: 1_500, tripsPerDay: null, commuteDays: null,
  checklist: { checked: { light: true, mold: true }, notes: {}, custom: [] }, note: "북향이라 어두움",
};

describe("policySource", () => {
  it("정책 이름·기관·지원 내용·신청 기간·나이를 글로, 정책 상세 링크", () => {
    const source = policySource(policy, 0);
    expect(source).toMatchObject({ id: "P1", kind: "policy", href: "/policy/P-001" });
    expect(source.title).toBe("청년 주거 정책: 청년 월세 한시 특별지원");
    expect(source.text).toContain("국토교통부");
    expect(source.text).toContain("월 최대 20만원");
    expect(source.text).toContain("신청 2026-11-01 ~ 2026-12-31");
    expect(source.text).toContain("만 19~34세");
  });
  it("상시·기간 모름은 그대로 밝힌다(자격 판정은 하지 않음)", () => {
    expect(policySource({ ...policy, periodKind: "always" }, 1).text).toContain("상시 신청");
    expect(policySource({ ...policy, periodKind: "unknown", support: null }, 1).text).toContain("공고문 확인");
  });
});

describe("interestHomeSource", () => {
  it("입력값만으로 낸 실질 주거비와 빠진 항목, 점검 확인·안 본 항목, 메모", () => {
    const source = interestHomeSource(home, { index: 0, month: 11 });
    expect(source).toMatchObject({ id: "I1", kind: "interest_home", href: "/compare/h1", title: "관심 주택: 역세권 오피스텔" });
    // 월세 550,000 + 관리비 80,000 + 교통비 1,500×2×22=66,000
    expect(source.text).toContain("실질 주거비 696,000원");
    expect(source.text).toContain("미입력: 에너지비");
    expect(source.text).toContain("입주 전 점검 2/7 확인(채광, 곰팡이)");
    expect(source.text).toContain("메모: 북향이라 어두움");
  });
  it("점검을 안 했으면 그렇게 적는다", () => {
    expect(interestHomeSource({ ...home, checklist: { checked: {}, notes: {}, custom: [] }, note: null }, { index: 1, month: 11 }).text).toContain("입주 전 점검 0/7 확인");
  });
});

describe("defectSource", () => {
  it("날짜·종류·메모·사진 여부(사진 주소는 넣지 않음)", () => {
    const source = defectSource({ occurredOn: "2026-11-10", kind: "leak", memo: "욕실 천장 물 떨어짐", hasPhoto: true }, 0);
    expect(source).toMatchObject({ id: "D1", kind: "defect", href: "/qc/records", title: "하자 기록: 2026-11-10 누수" });
    expect(source.text).toContain("욕실 천장 물 떨어짐");
    expect(source.text).toContain("사진 있음");
  });
});

describe("새 자료 종류의 출처 이름과 찾기", () => {
  it("출처 이름을 종류마다 붙인다", () => {
    expect(sourceLabel("policy")).toBe("공공데이터: 온통청년 정책");
    expect(sourceLabel("interest_home")).toBe("내 정보: 관심 주택");
    expect(sourceLabel("defect")).toBe("내 정보: 하자 기록");
  });
  it("정책·관심 주택·하자 질문에 맞는 자료를 고른다", () => {
    const all = [policySource(policy, 0), interestHomeSource(home, { index: 0, month: 11 }), defectSource({ occurredOn: "2026-11-10", kind: "leak", memo: "욕실", hasPhoto: false }, 0)];
    expect(rankSources("청년 월세 지원 정책 뭐 있어?", all, 1)[0].kind).toBe("policy");
    expect(rankSources("관심 주택 실질 주거비 얼마야", all, 1)[0].kind).toBe("interest_home");
    expect(rankSources("누수 하자 언제 기록했지", all, 1)[0].kind).toBe("defect");
  });
});
