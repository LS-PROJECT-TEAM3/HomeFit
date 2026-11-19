// spec 012 FR-017: 위키 쪽을 점으로, 쪽 사이 [[링크]]를 선으로 그리는 그래프(옵시디언 그래프 뷰처럼). 순수 함수
// 데이터는 wiki/ 파일에서 바로 만든다(AC1). 배치는 예림 시안(위키그래프-시안.html)의 힘 배치를 옮겼다
import { SKIPPED_PAGES, type WikiPageText } from "./wiki-pages";

export type GraphNode = { page: string; kind: string; summary: string; degree: number };
export type GraphEdge = { from: string; to: string };
export type PlacedNode = GraphNode & { x: number; y: number };
export type WikiGraph = { nodes: PlacedNode[]; edges: GraphEdge[] };
export type ViewBox = [number, number, number, number];

// wiki-lint와 같은 링크·코드 규칙(scripts/wiki-lint.mjs)
const LINK = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g;
const CODE = /```[\s\S]*?```|`[^`\n]*`/g;

function summaryOf(markdown: string): string {
  const line = markdown.replace(/\r\n/g, "\n").split("\n").find((l) => l.startsWith(">"));
  return line ? line.replace(/^>\s?/, "").trim() : "";
}

function linksOf(markdown: string): string[] {
  return [...markdown.replace(CODE, "").matchAll(LINK)].map((m) => m[1].trim());
}

/** 주제 쪽을 점으로, 양방향 링크를 선 하나로. 없는 쪽·자기 자신·목차 같은 특별한 쪽으로 가는 링크는 뺀다 */
export function buildWikiGraph(pages: readonly WikiPageText[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const topics = pages.filter((p) => !SKIPPED_PAGES.has(p.page));
  const names = new Set(topics.map((p) => p.page));
  const seen = new Set<string>();
  const edges: GraphEdge[] = [];
  for (const p of topics) {
    for (const target of linksOf(p.markdown)) {
      const key = [p.page, target].sort().join("|");
      if (target === p.page || !names.has(target) || seen.has(key)) continue;
      seen.add(key);
      edges.push({ from: p.page, to: target });
    }
  }
  const degree = graphNeighbors(edges);
  const nodes = topics.map((p) => ({ page: p.page, kind: p.page.split("-")[0], summary: summaryOf(p.markdown), degree: degree.get(p.page)?.size ?? 0 }));
  return { nodes, edges };
}

export function graphNeighbors(edges: readonly GraphEdge[]): Map<string, Set<string>> {
  const near = new Map<string, Set<string>>();
  const add = (a: string, b: string) => near.set(a, (near.get(a) ?? new Set()).add(b));
  for (const e of edges) { add(e.from, e.to); add(e.to, e.from); }
  return near;
}

type Point = { x: number; y: number };
const STEPS = 500;

/** 처음 자리: 갈래마다 원 위 한 방향에 모아 두고 조금씩 흩는다(같은 입력이면 같은 자리) */
function startPoints(nodes: readonly GraphNode[]): Point[] {
  const kinds = [...new Set(nodes.map((n) => n.kind))];
  return nodes.map((n, i) => {
    const t = (kinds.indexOf(n.kind) / kinds.length) * Math.PI * 2;
    return { x: Math.cos(t) * 200 + Math.cos(i * 2.4) * 40, y: Math.sin(t) * 200 + Math.sin(i * 2.4) * 40 };
  });
}

/** 한 번 움직일 힘: 점끼리 밀고, 선으로 당기고, 가운데로 모은다 */
function forces(points: readonly Point[], links: readonly [number, number][]): Point[] {
  const force = points.map(() => ({ x: 0, y: 0 }));
  const push = (i: number, j: number, fx: number, fy: number) => { force[i].x += fx; force[i].y += fy; force[j].x -= fx; force[j].y -= fy; };
  for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
    const dx = points[i].x - points[j].x, dy = points[i].y - points[j].y;
    const d2 = Math.max(dx * dx + dy * dy, 25), d = Math.sqrt(d2), f = 2600 / d2;
    push(i, j, (dx / d) * f, (dy / d) * f);
  }
  for (const [i, j] of links) {
    const dx = points[j].x - points[i].x, dy = points[j].y - points[i].y, d = Math.hypot(dx, dy) || 1, f = (d - 70) * 0.04;
    push(i, j, (dx / d) * f, (dy / d) * f);
  }
  points.forEach((p, i) => { force[i].x -= p.x * 0.012; force[i].y -= p.y * 0.012; });
  return force;
}

// shortcut: 점 쌍을 모두 보는 배치라 쪽 수의 제곱만큼 든다(60쪽 × 500번은 수 ms). 쪽이 수백 개로 늘면 나눠 세는 방식으로(spec 012 제외 범위의 업그레이드 시점)
export function layoutWikiGraph(graph: { nodes: GraphNode[]; edges: GraphEdge[] }): WikiGraph {
  const index = new Map(graph.nodes.map((n, i) => [n.page, i]));
  const links = graph.edges.map((e) => [index.get(e.from) ?? 0, index.get(e.to) ?? 0] as [number, number]);
  const points = startPoints(graph.nodes);
  const clamp = (v: number) => Math.max(-12, Math.min(12, v));
  for (let step = 0; step < STEPS; step++) {
    const cool = 1 - step / STEPS;
    forces(points, links).forEach((f, i) => { points[i].x += clamp(f.x) * cool; points[i].y += clamp(f.y) * cool; });
  }
  const round = (v: number) => Math.round(v * 10) / 10;
  return { nodes: graph.nodes.map((n, i) => ({ ...n, x: round(points[i].x), y: round(points[i].y) })), edges: graph.edges };
}

/** 고른 점을 여백과 함께 담는 보기 상자. 그래프 상자 비율(가로/세로)에 맞춘다 */
export function graphBounds(points: readonly Point[], pad: number, ratio: number): ViewBox {
  if (points.length === 0) return [-100, -100 / ratio, 200, 200 / ratio];
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const minX = Math.min(...xs) - pad, minY = Math.min(...ys) - pad;
  let w = Math.max(...xs) + pad - minX, h = Math.max(...ys) + pad - minY;
  const cx = minX + w / 2, cy = minY + h / 2;
  if (w / h > ratio) h = w / ratio; else w = h * ratio;
  return [cx - w / 2, cy - h / 2, w, h];
}

/** 마우스로 끈 만큼(화면 점) 보기 상자를 옮긴다. widthPx는 그래프가 화면에 그려진 폭 */
export function panBox(box: ViewBox, dxPx: number, dyPx: number, widthPx: number): ViewBox {
  const scale = box[2] / (widthPx || 1);
  return [box[0] - dxPx * scale, box[1] - dyPx * scale, box[2], box[3]];
}

/** 휠 확대·축소. 마우스 자리(상자 안 비율 fx·fy)는 그대로 두고, 폭은 전체 그래프 폭의 1/8 ~ 3배로 막는다 */
export function zoomBox(box: ViewBox, factor: number, at: { fx: number; fy: number }, fullWidth: number): ViewBox {
  const [x, y, w, h] = box;
  const width = Math.min(fullWidth * 3, Math.max(fullWidth / 8, w * factor));
  const height = h * (width / w);
  return [x + (w - width) * at.fx, y + (h - height) * at.fy, width, height];
}
