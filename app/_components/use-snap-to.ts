"use client";

import { useEffect, type RefObject } from "react";

// 사용자 요청(2026-11-21): 맨 위에서 아래로 스크롤하면 위쪽(제목·포스터 띠)이 올라가며 target부터 한 화면에 맞게,
// 그 사이에서 위로 스크롤하면 처음 화면으로 부드럽게 옮긴다. target 아래로는 평소처럼 스크롤. 집 비교·홈(띠는 보드 크기)이 쓴다
type Options = { gap?: number; minWidth?: number };

export function useSnapTo(targetRef: RefObject<HTMLElement | null>, { gap = 0, minWidth = 0 }: Options = {}) {
  useEffect(() => {
    let lastY = window.scrollY;
    let moving = false;
    const wide = window.matchMedia(`(min-width: ${minWidth}px)`);
    const done = () => { moving = false; lastY = window.scrollY; };
    const go = (top: number) => {
      moving = true;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
      window.setTimeout(done, 700); // scrollend가 없는 브라우저 대비
    };
    const onScroll = () => {
      const el = targetRef.current;
      if (!el || moving || !wide.matches) return;
      const y = window.scrollY;
      const target = Math.max(0, el.getBoundingClientRect().top + y - gap);
      if (y > 0 && y < target - 1) go(y > lastY ? target : 0);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scrollend", done);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scrollend", done);
    };
  }, [targetRef, gap, minWidth]);
}
