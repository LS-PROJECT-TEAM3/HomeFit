"use client";

import { useEffect, type RefObject } from "react";

// 사용자 요청(2026-11-21): 맨 위에서 아래로 스크롤하면 제목이 올라가며 비교 현황 + 관심 주택 목록이 한 화면에 맞게,
// 그 사이에서 위로 스크롤하면 처음 화면(제목 + 비교 현황)으로 부드럽게 옮긴다. 비교 현황 아래로는 평소처럼 스크롤
const GAP_ABOVE_TRAY = 24;

export function useSnapToTray(trayRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    let lastY = window.scrollY;
    let moving = false;
    const done = () => { moving = false; lastY = window.scrollY; };
    const go = (top: number) => {
      moving = true;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
      window.setTimeout(done, 700); // scrollend가 없는 브라우저 대비
    };
    const onScroll = () => {
      const tray = trayRef.current;
      if (!tray || moving) return;
      const y = window.scrollY;
      const target = Math.max(0, tray.getBoundingClientRect().top + y - GAP_ABOVE_TRAY);
      if (y > 0 && y < target - 1) go(y > lastY ? target : 0);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scrollend", done);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scrollend", done);
    };
  }, [trayRef]);
}
