"use client";

import { useEffect, type RefObject } from "react";
import { chromeLocked } from "./chrome";

// 사용자 요청(2026-11-21): 맨 위에서 아래로 스크롤하면 위쪽(제목·포스터 띠)이 올라가며 target부터 한 화면에 맞게,
// 그 사이에서 위로 스크롤하면 처음 화면으로 부드럽게 옮긴다. target 아래로는 평소처럼 스크롤.
// 집 비교·홈·집 점검이 쓴다. 조작 요소를 누를 때의 맞춤은 focus-scroll.tsx, 메뉴·탭 숨김은 chrome.ts가 맡는다
type Options = { gap?: number; minWidth?: number; maxWidth?: number };

export function useSnapTo(targetRef: RefObject<HTMLElement | null>, { gap = 0, minWidth = 0, maxWidth }: Options = {}) {
  useEffect(() => {
    let lastY = window.scrollY;
    let moving = false;
    let dest = 0;
    let timer: number | undefined;
    const media = window.matchMedia(maxWidth === undefined ? `(min-width: ${minWidth}px)` : `(min-width: ${minWidth}px) and (max-width: ${maxWidth}px)`);
    const done = () => { moving = false; lastY = window.scrollY; };
    // 사용자 스크롤의 "끝남" 신호가 우리 이동 중에 늦게 오면 무시한다(목적지 근처에서만 끝냄). 그래야 이동이 중간에 다시 시작되지 않는다
    const onScrollEnd = () => { if (!moving || Math.abs(window.scrollY - dest) <= 2) done(); };
    const targetY = () => {
      const el = targetRef.current;
      return el ? Math.max(0, el.getBoundingClientRect().top + window.scrollY - gap) : null;
    };
    const go = (top: number) => {
      moving = true;
      dest = top;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
      window.clearTimeout(timer);
      timer = window.setTimeout(done, 1000); // scrollend가 없거나 늦는 브라우저 대비
    };
    const onScroll = () => {
      const target = targetY();
      const y = window.scrollY;
      // 조작 요소를 눌러 자동 이동 중(focus-scroll)에는 끼어들지 않는다
      if (chromeLocked()) { lastY = y; return; }
      if (target === null || moving || !media.matches) return;
      if (y > 0 && y < target - 1) go(y > lastY ? target : 0);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scrollend", onScrollEnd);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scrollend", onScrollEnd);
      window.clearTimeout(timer);
    };
  }, [targetRef, gap, minWidth, maxWidth]);
}
