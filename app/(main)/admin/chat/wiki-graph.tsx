"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { graphBounds, graphNeighbors, panBox, zoomBox, type PlacedNode, type ViewBox, type WikiGraph } from "@/chat/wiki-graph";
import styles from "@/app/_components/hub.module.css";
import own from "./wiki-graph.module.css";

/** 그래프에서 켤 쪽: 답의 출처 쪽들, 또는 사람이 고른 쪽 하나 */
export type GraphFocus = { pages: string[]; selected: string | null };

const KIND_KEY: Record<string, string> = {
  규칙: "rule", 기능: "feature", 요구: "requirement", 데이터: "data", 화면: "screen",
  여정: "journey", 결정: "decision", 문제: "problem", 인터뷰: "interview", 팀: "team",
};
const kindColor = (kind: string) => `var(--color-wiki-${KIND_KEY[kind] ?? "interview"})`;
const radius = (n: PlacedNode) => 4 + Math.min(n.degree, 14) * 0.55;
const ZOOM_MS = 700; // 시안과 같은 확대 시간. 움직임 줄이기면 0
const START_RATIO = 1.8;
const MAX_LINKED = 8;
const WHEEL_STEP = 1.15; // 휠 한 칸에 15%씩 확대·축소

/** 그래프 상자 비율(가로/세로). 화면 크기가 바뀔 때마다 다시 잰다 */
function useRatio(svgRef: RefObject<SVGSVGElement | null>) {
  const [ratio, setRatio] = useState(START_RATIO);
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setRatio(el.clientWidth / el.clientHeight || START_RATIO));
    observer.observe(el);
    return () => observer.disconnect();
  }, [svgRef]);
  return ratio;
}

/** 켤 쪽에 맞춰 보기 상자를 부드럽게 옮긴다. place는 마우스로 옮길 때 애니메이션 없이 바로 놓는다 */
function useZoom(nodes: readonly PlacedNode[], active: readonly string[], resetCount: number) {
  const svgRef = useRef<SVGSVGElement>(null);
  const ratio = useRatio(svgRef);
  const key = active.join("|");
  const target = useMemo<ViewBox>(() => {
    const picked = key ? nodes.filter((n) => key.split("|").includes(n.page)) : nodes;
    return graphBounds(picked, key ? (picked.length === 1 ? 110 : 80) : 40, ratio);
  }, [nodes, key, ratio]);
  const fullWidth = useMemo(() => graphBounds(nodes, 40, ratio)[2], [nodes, ratio]);
  const [box, setBox] = useState<ViewBox>(target);
  const boxRef = useRef(box);
  const frameRef = useRef(0);
  const place = useCallback((next: ViewBox) => {
    cancelAnimationFrame(frameRef.current);
    boxRef.current = next;
    setBox(next);
  }, []);
  useEffect(() => {
    const from = boxRef.current;
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : ZOOM_MS;
    const start = performance.now();
    const tick = (now: number) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      boxRef.current = from.map((v, i) => v + (target[i] - v) * eased) as ViewBox;
      setBox(boxRef.current);
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
    // resetCount: 마우스로 옮긴 뒤 "전체 보기"를 누르면 켤 쪽이 그대로여도 다시 맞춘다
  }, [target, resetCount]);
  useMousePan(svgRef, boxRef, place, fullWidth);
  return { svgRef, viewBox: box.join(" ") };
}

/**
 * 마우스로 빈 곳을 끌면 지도가 따라 움직이고, 휠로 마우스 자리를 기준으로 확대·축소한다(옵시디언 그래프 뷰처럼, 사용자 요청 2026-11-19).
 * 점 위에서 누르면 끌지 않고 고르기로 둔다. 손가락(터치)은 페이지 스크롤을 막지 않게 끌기에서 뺀다
 */
function useMousePan(svgRef: RefObject<SVGSVGElement | null>, boxRef: RefObject<ViewBox>, place: (next: ViewBox) => void, fullWidth: number) {
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    let last: { x: number; y: number } | null = null;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const at = { fx: (e.clientX - rect.left) / rect.width, fy: (e.clientY - rect.top) / rect.height };
      place(zoomBox(boxRef.current, e.deltaY > 0 ? WHEEL_STEP : 1 / WHEEL_STEP, at, fullWidth));
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0 || (e.target as Element).closest("g[role=button]")) return;
      last = { x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
      el.dataset.dragging = "true";
    };
    const onMove = (e: PointerEvent) => {
      if (!last) return;
      place(panBox(boxRef.current, e.clientX - last.x, e.clientY - last.y, el.getBoundingClientRect().width));
      last = { x: e.clientX, y: e.clientY };
    };
    const onUp = () => { last = null; delete el.dataset.dragging; };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [svgRef, boxRef, place, fullWidth]);
}

type CanvasProps = { graph: WikiGraph; hits: Set<string>; near: Set<string>; fromAnswer: boolean; onPick: (page: string) => void; svgRef: RefObject<SVGSVGElement | null>; viewBox: string };

/** 점과 선. 점은 Tab으로 옮기고 Enter·Space로 고른다(AC3) */
function GraphCanvas({ graph, hits, near, fromAnswer, onPick, svgRef, viewBox }: CanvasProps) {
  const pos = new Map(graph.nodes.map((n) => [n.page, n]));
  const dim = hits.size > 0;
  return (
    <svg ref={svgRef} className={`${own.svg} ${dim ? own.dim : ""}`} viewBox={viewBox} role="group" aria-label="위키 쪽 연결 그래프. 점을 Tab으로 옮겨 Enter로 고릅니다. 마우스로 빈 곳을 끌면 옮기고 휠로 확대·축소합니다">
      {graph.edges.map((e) => {
        const a = pos.get(e.from), b = pos.get(e.to);
        if (!a || !b) return null;
        const lit = hits.has(e.from) || hits.has(e.to);
        return <line key={`${e.from}|${e.to}`} className={`${own.edge} ${lit ? own.lit : ""}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
      })}
      {graph.nodes.map((n) => {
        const state = hits.has(n.page) ? own.hit : near.has(n.page) ? own.near : "";
        const label = hits.has(n.page) && fromAnswer ? `출처 · ${n.page}` : n.page;
        return (
          <g key={n.page} className={`${own.node} ${state}`} tabIndex={0} role="button" aria-label={`${label}, 연결 ${n.degree}개`}
            onClick={() => onPick(n.page)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(n.page); } }}>
            <title>{n.page}</title>
            <circle cx={n.x} cy={n.y} r={radius(n)} style={{ fill: kindColor(n.kind) }} />
            <text x={n.x + radius(n) + 3} y={n.y + 3}>{label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function GraphLegend({ nodes }: { nodes: readonly PlacedNode[] }) {
  const counts = new Map<string, number>();
  for (const n of nodes) counts.set(n.kind, (counts.get(n.kind) ?? 0) + 1);
  return (
    <ul className={own.legend} aria-label="갈래별 점 색">
      {[...counts].map(([kind, count]) => (
        <li key={kind}><span className={own.dot} style={{ background: kindColor(kind) }} aria-hidden="true" />{kind} {count}</li>
      ))}
    </ul>
  );
}

/** 고른 쪽의 이름·한 줄 요약·연결된 쪽(AC3) */
function PagePanel({ node, linked, onPick }: { node: PlacedNode; linked: string[]; onPick: (page: string) => void }) {
  return (
    <div className={own.panel} aria-live="polite">
      <p className={styles.muted}>{node.kind} 쪽</p>
      <h3 className={own.panelTitle}>{node.page}</h3>
      <p className={own.summary}>{node.summary || "한 줄 요약이 없습니다."}</p>
      <p className={styles.muted}>연결된 쪽 {linked.length}개{linked.length > MAX_LINKED ? ` (앞 ${MAX_LINKED}개)` : ""}</p>
      <ul className={own.linked}>
        {linked.slice(0, MAX_LINKED).map((page) => (
          <li key={page}><button type="button" className={own.linkButton} onClick={() => onPick(page)}>{page}</button></li>
        ))}
      </ul>
    </div>
  );
}

function statusText(graph: WikiGraph, focus: GraphFocus): string {
  if (focus.selected) return `${focus.selected} 쪽과 이어진 쪽을 켰습니다.`;
  if (focus.pages.length > 0) return `답의 출처 쪽 ${focus.pages.length}개를 켰습니다: ${focus.pages.join(", ")}`;
  return `쪽 ${graph.nodes.length}개 · 연결 ${graph.edges.length}개. 질문하면 답의 출처 쪽이 켜집니다.`;
}

// spec 012 FR-017: 위키 그래프(옵시디언 그래프 뷰처럼). 답의 출처 쪽을 글자와 함께 켜고 그쪽으로 확대한다
export function WikiGraphView({ graph, focus, onFocus }: { graph: WikiGraph | null; focus: GraphFocus; onFocus: (next: GraphFocus) => void }) {
  const nodes = useMemo(() => graph?.nodes ?? [], [graph]);
  const neighbors = useMemo(() => graphNeighbors(graph?.edges ?? []), [graph]);
  const active = focus.selected ? [focus.selected] : focus.pages;
  const [resetCount, setResetCount] = useState(0);
  const { svgRef, viewBox } = useZoom(nodes, active, resetCount);
  if (!graph) return <section className={styles.card}><h2>위키 지도</h2><p role="alert">위키 그래프를 불러오지 못했습니다. 잠시 뒤 새로 고쳐 주세요. 질문은 위에서 그대로 할 수 있습니다.</p></section>;
  const hits = new Set(active);
  const near = new Set([...hits].flatMap((page) => [...(neighbors.get(page) ?? [])]).filter((page) => !hits.has(page)));
  const selected = focus.selected ? nodes.find((n) => n.page === focus.selected) : undefined;
  const pick = (page: string) => onFocus({ pages: focus.pages, selected: page });
  return (
    <section className={`${styles.card} ${own.card}`} aria-labelledby="wiki-graph-title">
      <div className={own.head}>
        <h2 id="wiki-graph-title">위키 지도</h2>
        <button type="button" className={own.linkButton} onClick={() => { setResetCount((c) => c + 1); onFocus({ pages: [], selected: null }); }}>전체 보기</button>
      </div>
      <p className={styles.muted} role="status">{statusText(graph, focus)}</p>
      <p className={styles.muted}>빈 곳을 끌면 지도가 움직이고, 휠로 확대·축소합니다. 점을 누르면 그 쪽 설명이 나옵니다.</p>
      <GraphCanvas graph={graph} hits={hits} near={near} fromAnswer={!focus.selected} onPick={pick} svgRef={svgRef} viewBox={viewBox} />
      <GraphLegend nodes={nodes} />
      {selected ? <PagePanel node={selected} linked={[...(neighbors.get(selected.page) ?? [])]} onPick={pick} /> : null}
    </section>
  );
}
