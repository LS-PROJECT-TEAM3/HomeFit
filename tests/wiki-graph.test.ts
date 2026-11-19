import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildWikiGraph, graphBounds, graphNeighbors, layoutWikiGraph } from "@/chat/wiki-graph";

// spec 012 FR-017(위키 그래프), SC-015. plan 012 7단계 함수 시험
const page = (name: string, summary: string, links: string[]) => ({
  page: name,
  markdown: ["---", "type: 규칙", "updated: 2026-11-19", "---", `# ${name}`, `> ${summary}`, "## 내용", ...links.map((l) => `- [[${l}]]`), "## 연결", "- 목차: [[index]]"].join("\n"),
});

const pages = [
  page("규칙-사람 승인", "승인 전에는 조치하지 않는다.", ["기능-001 공고", "기능-001 공고", "없는 쪽", "규칙-사람 승인"]),
  page("기능-001 공고", "공고가 바뀌면 사건.", ["규칙-사람 승인"]),
  page("팀-용어집", "말 모음.", []),
  page("index", "목차", ["규칙-사람 승인"]),
  page("log", "기록", []),
  page("연결지도", "표", ["기능-001 공고"]),
  page("CLAUDE", "규칙", []),
];

describe("buildWikiGraph", () => {
  const graph = buildWikiGraph(pages);

  it("목차·작업 기록·연결지도·규칙 파일은 점으로 그리지 않는다(AC1)", () => {
    expect(graph.nodes.map((n) => n.page)).toEqual(["규칙-사람 승인", "기능-001 공고", "팀-용어집"]);
  });

  it("쪽 이름의 갈래와 > 한 줄 요약을 읽는다", () => {
    expect(graph.nodes[0]).toMatchObject({ kind: "규칙", summary: "승인 전에는 조치하지 않는다." });
  });

  it("[[링크]]는 양방향을 선 하나로, 없는 쪽·자기 자신·목차로 가는 링크는 뺀다", () => {
    expect(graph.edges).toEqual([{ from: "규칙-사람 승인", to: "기능-001 공고" }]);
    expect(graph.nodes.map((n) => n.degree)).toEqual([1, 1, 0]);
  });

  it("코드 글자 속 [[링크]]는 링크로 보지 않는다(wiki-lint와 같은 규칙)", () => {
    const withCode = buildWikiGraph([page("팀-A", "a", []), { page: "팀-B", markdown: "# 팀-B\n> b\n- `[[팀-A]]` 모양" }]);
    expect(withCode.edges).toEqual([]);
  });
});

describe("layoutWikiGraph", () => {
  it("같은 입력이면 같은 자리, 모든 자리가 유한한 수이고 겹치지 않는다", () => {
    const first = layoutWikiGraph(buildWikiGraph(pages));
    expect(layoutWikiGraph(buildWikiGraph(pages))).toEqual(first);
    for (const n of first.nodes) expect(Number.isFinite(n.x) && Number.isFinite(n.y)).toBe(true);
    expect(new Set(first.nodes.map((n) => `${n.x},${n.y}`)).size).toBe(first.nodes.length);
  });

  it("빈 위키도 오류 없이 빈 그래프", () => {
    expect(layoutWikiGraph(buildWikiGraph([]))).toEqual({ nodes: [], edges: [] });
  });
});

describe("graphBounds", () => {
  it("고른 점을 여백과 함께 모두 담고, 상자 비율을 맞춘다", () => {
    const [x, y, w, h] = graphBounds([{ x: 0, y: 0 }, { x: 100, y: 10 }], 10, 2);
    expect(x).toBeLessThanOrEqual(-10);
    expect(y).toBeLessThanOrEqual(-10);
    expect(x + w).toBeGreaterThanOrEqual(110);
    expect(y + h).toBeGreaterThanOrEqual(20);
    expect(w / h).toBeCloseTo(2);
  });

  it("점이 없으면 기본 상자", () => {
    expect(graphBounds([], 10, 2)).toEqual([-100, -50, 200, 100]);
  });
});

describe("graphNeighbors", () => {
  it("선 양쪽 끝을 서로의 이웃으로", () => {
    const near = graphNeighbors([{ from: "a", to: "b" }, { from: "b", to: "c" }]);
    expect([...(near.get("b") ?? [])].sort()).toEqual(["a", "c"]);
    expect([...(near.get("a") ?? [])]).toEqual(["b"]);
  });
});

describe("실제 wiki/ (C-913)", () => {
  it("점 수 = 주제 쪽 수(목차·log·연결지도·CLAUDE.md 제외), 깨진 선 없음", () => {
    const files = readdirSync("wiki").filter((n) => n.endsWith(".md"));
    const graph = buildWikiGraph(files.map((n) => ({ page: n.replace(/\.md$/, ""), markdown: readFileSync(`wiki/${n}`, "utf8") })));
    expect(graph.nodes.length).toBe(files.length - 4);
    const names = new Set(graph.nodes.map((n) => n.page));
    for (const e of graph.edges) expect(names.has(e.from) && names.has(e.to)).toBe(true);
    expect(graph.edges.length).toBeGreaterThan(graph.nodes.length);
  });
});
