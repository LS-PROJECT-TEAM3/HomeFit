import { describe, expect, it } from "vitest";
import { chunkWiki, pickChunks, splitWikiPage } from "@/chat/wiki-pages";

// spec 010 FR-010(위키 쪽만 근거), FR-011(없으면 찾지 않음). plan 010 4단계 함수 시험
const page = [
  "---",
  "type: 규칙",
  "sources:",
  "  - docs/PRD.md",
  "updated: 2026-11-18",
  "---",
  "# 규칙-사람 승인",
  "> 사람이 승인하기 전에는 조치하지 않는다.",
  "## 내용",
  "- 관리자도 승인을 건너뛰지 못한다. (근거: docs/Intent.md · ## 4. 제약)",
  "## 충돌",
  "없음",
  "## 연결",
  "- [[index]]",
].join("\n");

describe("splitWikiPage", () => {
  it("앞머리를 빼고 ## 절마다 조각 하나(쪽 이름·절 제목·본문)", () => {
    const chunks = splitWikiPage("규칙-사람 승인", page);
    expect(chunks.map((c) => c.heading)).toEqual(["요약", "내용", "충돌", "연결"]);
    expect(chunks[1]).toMatchObject({ page: "규칙-사람 승인", heading: "내용" });
    expect(chunks[1].text).toContain("관리자도 승인을 건너뛰지 못한다");
    expect(chunks.some((c) => c.text.includes("type: 규칙"))).toBe(false);
  });

  it("CRLF 줄바꿈도 같은 결과", () => {
    expect(splitWikiPage("규칙-사람 승인", page.replace(/\n/g, "\r\n"))).toEqual(splitWikiPage("규칙-사람 승인", page));
  });
});

describe("chunkWiki", () => {
  it("목차·작업 기록·연결지도·규칙 파일은 빼고, 띄어쓰기 있는 쪽 이름은 그대로", () => {
    const chunks = chunkWiki([
      { page: "index", markdown: "# 목차\n## 규칙\n- [[규칙-사람 승인]]" },
      { page: "log", markdown: "# 작업 기록\n## x\n- 넣기" },
      { page: "연결지도", markdown: "# 연결 지도\n## 연결\n- [[index]]" },
      { page: "CLAUDE", markdown: "# 규칙\n## 폴더\n원본" },
      { page: "규칙-사람 승인", markdown: page },
    ]);
    expect(new Set(chunks.map((c) => c.page))).toEqual(new Set(["규칙-사람 승인"]));
  });
});

describe("pickChunks", () => {
  const chunks = chunkWiki([
    { page: "규칙-사람 승인", markdown: page },
    { page: "규칙-사건 기준", markdown: "# 규칙-사건 기준\n## 내용\n- 습도 70% 이상이면 위험. 결로 기준은 spec 003." },
    { page: "팀-용어집", markdown: "# 팀-용어집\n## 내용\n- 사건은 위험·기회 알림. 승인 버튼." },
  ]);

  it("질문 낱말이 많이 겹치는 조각부터(조사 붙은 낱말도 찾음)", () => {
    const picked = pickChunks("승인 규칙은 어느 문서에 있어?", chunks, 4);
    expect(picked[0]).toMatchObject({ page: "규칙-사람 승인" });
  });

  it("최대 개수만 돌려준다", () => {
    expect(pickChunks("승인 규칙 사건 결로 위험 내용", chunks, 2)).toHaveLength(2);
  });

  it("겹치는 낱말이 없으면 빈 목록(AI를 부르지 않게)", () => {
    expect(pickChunks("대표님 점심 메뉴는?", chunks, 4)).toEqual([]);
  });

  it("빈 질문은 빈 목록", () => {
    expect(pickChunks("   ", chunks, 4)).toEqual([]);
  });
});
