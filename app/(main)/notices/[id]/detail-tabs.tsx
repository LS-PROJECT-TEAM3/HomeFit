"use client";

import { useState, type ReactNode } from "react";
import styles from "./detail.module.css";

// spec 022(캔버스 v2-s4-pc "공고 상세 목차"): 핵심 요약 / 단지별 월 임대료 / 내 알림. 내용은 서버에서 그려 받는다
type Tab = { key: string; label: string; count?: number; panel: ReactNode };

export function DetailTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0].key);
  const move = (dir: 1 | -1) => {
    const i = tabs.findIndex((t) => t.key === active);
    const next = tabs[(i + dir + tabs.length) % tabs.length];
    setActive(next.key);
    document.getElementById(`tab-${next.key}`)?.focus();
  };
  return (
    <>
      <div role="tablist" aria-label="공고 상세 목차" className={styles.tabs}
        onKeyDown={(e) => { if (e.key === "ArrowRight") move(1); if (e.key === "ArrowLeft") move(-1); }}>
        {tabs.map((tab) => (
          <button key={tab.key} id={`tab-${tab.key}`} type="button" role="tab" aria-selected={active === tab.key} aria-controls={`panel-${tab.key}`}
            tabIndex={active === tab.key ? 0 : -1} className={`${styles.tab} ${active === tab.key ? styles.tabOn : ""}`} onClick={() => setActive(tab.key)}>
            {tab.label}{tab.count ? <span className={styles.tabCount}>{tab.count}</span> : null}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div key={tab.key} id={`panel-${tab.key}`} role="tabpanel" aria-labelledby={`tab-${tab.key}`} hidden={active !== tab.key} className={styles.panel}>{tab.panel}</div>
      ))}
    </>
  );
}
