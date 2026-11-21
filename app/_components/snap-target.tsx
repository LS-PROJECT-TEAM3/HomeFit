"use client";

import { useRef, type ReactNode } from "react";
import { useSnapTo } from "./use-snap-to";

/** 서버 화면에서 쓰는 감싸개. 맨 위에서 아래로 스크롤하면 이 영역 맨 위로 부드럽게 옮긴다(use-snap-to.ts) */
export function SnapTarget({ className, minWidth, children }: { className?: string; minWidth?: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useSnapTo(ref, { minWidth });
  return <div ref={ref} className={className}>{children}</div>;
}
