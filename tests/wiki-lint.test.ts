import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { currentHashes, lint } from "../scripts/wiki-lint.mjs";
import { search } from "../scripts/wiki-search.mjs";

// spec 009 FR-007(점검은 표로만), FR-002(원본 바뀜), FR-001·FR-005(필수 절·목차). plan 009 2단계

let root: string;

function put(path: string, text: string) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
}

function page(name: string, { sources = ["docs/PRD.md"], body = "- 사실. (근거: docs/PRD.md · FR-26)", links = "[[index]]", omit = "" } = {}) {
  const sections = ["## 내용", body, "## 충돌", "없음", "## 확인 필요", "없음", "## 연결", `- ${links}`].filter((line) => line !== omit);
  const front = ["---", "type: 규칙", "sources:", ...sources.map((s) => `  - ${s}`), "updated: 2026-11-18", "---"];
  put(`wiki/${name}.md`, [...front, `# ${name}`, "> 요약.", ...sections, ""].join("\n"));
}

/** 문제 0건인 작은 위키: 원본 1개, 쪽 1개, 목차·기록·연결지도, 지문 기록됨 */
function healthyWiki() {
  put("docs/PRD.md", "# PRD\n\nFR-26 위키 챗봇\n");
  put("wiki/index.md", "# 목차\n\n- [[규칙-위키 챗봇]]\n- [[연결지도]]\n- [[log]]\n");
  put("wiki/log.md", "# 작업 기록\n\n모양: `- 날짜 | 만든: [[...]]`\n");
  put("wiki/연결지도.md", "# 연결 지도\n\n- [[index]]\n");
  put("wiki/CLAUDE.md", "# 규칙\n\n`## 연결`에는 [[다른 쪽]]과 [[index]]\n");
  page("규칙-위키 챗봇");
  put("wiki/raw-hashes.json", JSON.stringify(currentHashes(root)));
}

const kinds = () => lint(root).map((p: { kind: string }) => p.kind);

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "wiki-lint-"));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("wiki-lint", () => {
  it("문제 없는 위키는 0건 (CLAUDE.md·log의 코드 표기 속 링크는 보지 않는다)", () => {
    healthyWiki();
    expect(lint(root)).toEqual([]);
  });

  it("없는 쪽으로 가는 링크는 깨진 링크", () => {
    healthyWiki();
    page("규칙-위키 챗봇", { links: "[[없는 쪽]], [[index]]" });
    expect(kinds()).toEqual(["깨진 링크"]);
  });

  it("코드 블록 안의 링크는 무시한다", () => {
    healthyWiki();
    page("규칙-위키 챗봇", { body: "- 사실. (근거: docs/PRD.md · FR-26)\n```\n[[예시 쪽]]\n```" });
    expect(lint(root)).toEqual([]);
  });

  it("sources가 비면 출처 없음, 없는 경로를 근거로 대면 출처 경로 없음", () => {
    healthyWiki();
    page("규칙-위키 챗봇", { sources: [], body: "- 사실. (근거: docs/없는문서.md · 1절)" });
    expect(kinds()).toEqual(["출처 없음", "출처 경로 없음", "정리 안 된 원본"]);
  });

  it("필수 절이 없으면 필수 절 빠짐", () => {
    healthyWiki();
    page("규칙-위키 챗봇", { omit: "## 충돌" });
    expect(kinds()).toEqual(["필수 절 빠짐"]);
  });

  it("목차에 없는 쪽은 목차 누락", () => {
    healthyWiki();
    page("규칙-사람 승인");
    expect(kinds()).toEqual(["목차 누락"]);
  });

  it("특수 쪽(index·log·연결지도)은 sources가 없어도 문제가 아니다", () => {
    healthyWiki();
    expect(kinds()).not.toContain("출처 없음");
  });

  it("기록한 지문과 다르면 원본 바뀜", () => {
    healthyWiki();
    put("docs/PRD.md", "# PRD\n\nFR-26 위키 챗봇 (고침)\n");
    expect(kinds()).toEqual(["원본 바뀜"]);
  });

  it("줄바꿈만 CRLF로 바뀐 원본은 바뀜이 아니다(git autocrlf)", () => {
    healthyWiki();
    put("docs/PRD.md", "# PRD\r\n\r\nFR-26 위키 챗봇\r\n");
    expect(lint(root)).toEqual([]);
  });

  it("하위 폴더 원본과 interviews도 원본으로 센다: 새 원본·정리 안 된 원본", () => {
    healthyWiki();
    put("docs/specs/001-공고/spec.md", "# spec\n");
    put("interviews/P01.md", "# P01\n");
    expect(lint(root).map((p: { kind: string; page: string }) => `${p.kind} ${p.page}`)).toEqual([
      "새 원본 docs/specs/001-공고/spec.md",
      "새 원본 interviews/P01.md",
      "정리 안 된 원본 docs/specs/001-공고/spec.md",
      "정리 안 된 원본 interviews/P01.md",
    ]);
  });

  it("맨 위 GLOSSARY.md도 원본이고 근거 경로로 쓸 수 있다", () => {
    healthyWiki();
    put("GLOSSARY.md", "# 용어\n\n**사건**: 바깥 변화 한 건\n");
    page("팀-용어집", { sources: ["GLOSSARY.md"], body: "- 사건은 바깥 변화 한 건. (근거: GLOSSARY.md · 사건)" });
    put("wiki/index.md", "# 목차\n\n- [[규칙-위키 챗봇]]\n- [[팀-용어집]]\n- [[연결지도]]\n- [[log]]\n");
    expect(lint(root).map((p: { kind: string; page: string }) => `${p.kind} ${p.page}`)).toEqual(["새 원본 GLOSSARY.md"]);
  });

  it("위키 챗봇 정답표 docs/wiki-chat.md는 원본이 아니다(질문 글자가 위키에 들어가지 않게)", () => {
    healthyWiki();
    put("docs/wiki-chat.md", "# 정답표\n\n| Q4 | 없음 | 대표님 점심 메뉴는? |\n");
    expect(lint(root)).toEqual([]);
  });

  it("지문에만 있고 파일이 없으면 원본 사라짐", () => {
    healthyWiki();
    rmSync(join(root, "docs/PRD.md"));
    expect(kinds()).toContain("원본 사라짐");
  });

  it("점검은 위키 파일을 고치지 않는다", () => {
    healthyWiki();
    page("규칙-위키 챗봇", { links: "[[없는 쪽]]" });
    const before = currentHashes(root);
    lint(root);
    expect(currentHashes(root)).toEqual(before);
  });
});

describe("wiki-search", () => {
  it("위키 줄이 원본 줄보다 먼저, 많이 맞은 줄부터", () => {
    healthyWiki();
    const found = search(root, ["위키", "챗봇"]);
    expect(found[0]).toMatchObject({ layer: "위키" });
    expect(found.at(-1)).toMatchObject({ layer: "원본", path: "docs/PRD.md", line: 3 });
  });

  it("못 찾으면 빈 목록", () => {
    healthyWiki();
    expect(search(root, ["점심"])).toEqual([]);
  });
});
