"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { InfoTip } from "@/app/_components/info-tip";
import { completeTotal, lowestItems, MAX_COMPARE, toggleCompare } from "@/incident/compare-tray";
import { deleteInterestHome } from "./actions";
import { homeMeta, ListCard, TrayCard } from "./compare-cards";
import { CompareDrawer, type DrawerTarget } from "./compare-drawer";
import { useSnapTo } from "@/app/_components/use-snap-to";
import type { RealCost } from "@/incident/real-cost";
import type { CompareHome, LoadedCompare } from "./load-compare";

import styles from "./compare.module.css";

// spec 022 FR-011, IA v1.17 CP_040000_PG: 집 비교 한 화면(관심 주택·실질 주거비 비교·추천 결과를 합침), 캔버스 기본형 보드 5종
// 점수는 매기지 않고 계산한 금액과 항목별 최저값만 보인다(CLAUDE.md 하지 않을 것)

const TRAY_TIP = "금액은 월세, 관리비, 에너지비, 교통비를 더한 한 달 실질 주거비예요. 초록색으로 칠한 칸은 항목별로 가장 낮은 값이에요";

const GHOST_ITEM = { value: 0, kind: "input" as const };
const GHOST_COST: RealCost = { rent: GHOST_ITEM, fee: GHOST_ITEM, energy: GHOST_ITEM, transit: GHOST_ITEM, total: 0, missing: [], estimated: [] };

/** 빈 칸. 보이지 않는 카드 틀을 깔아 주택을 골라도 칸 높이가 바뀌지 않게 한다(사용자 요청 2026-11-21) */
function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.placeholder}>
      <div className={styles.ghost} aria-hidden="true"><TrayCard name="내 집" meta="빈 칸" cost={GHOST_COST} lowest={new Set()} /></div>
      <span className={styles.placeholderText}>{children}</span>
    </div>
  );
}

function Tray({ data, chosen, onRemove }: { data: LoadedCompare; chosen: CompareHome[]; onRemove: (id: string) => void }) {
  const costs = [...(data.mine ? [data.mine.cost] : []), ...chosen.map((h) => h.cost)];
  const lowest = lowestItems(costs);
  const offset = data.mine ? 1 : 0;
  const mineTotal = data.mine ? completeTotal(data.mine.cost) : null;
  const columns = offset + chosen.length + (chosen.length === 0 ? 1 : 0) + (data.mine ? 0 : 1);
  return (
    <section className={styles.tray} aria-labelledby="tray-title">
      <div className={styles.trayHead}>
        <h2 id="tray-title" className={styles.sectionTitle}>비교 현황</h2>
        <InfoTip icon text={TRAY_TIP} label="비교 기준 설명 보기" />
      </div>
      <div className={styles.trayGrid} style={{ "--tray-columns": columns } as React.CSSProperties}>
        {data.mine ? (
          <TrayCard name="내 집" meta={homeMeta(data.mine.housingType, data.mine.exclusiveAreaM2)} cost={data.mine.cost} lowest={lowest[0]} />
        ) : (
          <Placeholder>내 집에 월세를 넣으면<br />기준으로 비교해요 <Link href="/my/home">내 집 입력</Link></Placeholder>
        )}
        {chosen.map((home, index) => (
          <TrayCard key={home.id} name={home.name} meta={homeMeta(home.housingType, home.exclusiveAreaM2)} cost={home.cost} lowest={lowest[offset + index]}
            mineTotal={mineTotal} onRemove={() => onRemove(home.id)} />
        ))}
        {chosen.length === 0 ? <Placeholder>아래에서 비교할 집을<br />선택해 보세요</Placeholder> : null}
      </div>
    </section>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className={styles.empty}>
      <h2 className={styles.emptyTitle}>관심 주택을 등록해 보세요</h2>
      <p className={styles.emptyText}>등록하면 내 집과 한 달 비용을 비교할 수 있어요</p>
      <div className={styles.emptyAction}><button type="button" className={styles.buttonHero} onClick={onAdd}>+ 관심 주택 등록</button></div>
    </div>
  );
}

function useDrawer() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [target, setTarget] = useState<DrawerTarget | null>(null);
  const open = (next: DrawerTarget) => {
    setTarget(next);
    dialogRef.current?.showModal();
  };
  return { dialogRef, target, open, close: () => setTarget(null) };
}

export function CompareBoard({ data, header }: { data: LoadedCompare; header: React.ReactNode }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();
  const drawer = useDrawer();
  const trayRef = useRef<HTMLDivElement>(null);
  useSnapTo(trayRef, { gap: 24 }); // 비교 현황 위 24px
  const homes = data.homes;
  const chosen = selected.map((id) => homes.find((h) => h.id === id)).filter((h): h is CompareHome => h !== undefined);

  const toggle = (id: string) => {
    const next = toggleCompare(selected, id);
    setSelected(next.selected);
    setNotice(next.refused ? `${MAX_COMPARE}곳까지 비교할 수 있어요. 하나를 빼고 골라 주세요.` : null);
  };
  const remove = (home: CompareHome) => {
    if (!window.confirm(`${home.name}을(를) 지울까요? 되돌릴 수 없어요.`)) return;
    startDelete(async () => {
      const result = await deleteInterestHome(home.id);
      setNotice(result.error ?? null);
      if (!result.error) setSelected((prev) => prev.filter((id) => id !== home.id));
    });
  };

  return (
    <>
      {homes.length === 0 ? <>{header}<EmptyState onAdd={() => drawer.open({ mode: "new" })} /></> : (
        <>
          {/* 첫 화면: 제목 + 비교 현황이 창 높이를 채워 관심 주택 목록은 스크롤해야 보인다(사용자 요청 2026-11-21) */}
          <div className={styles.firstScreen}>
            {header}
            <div ref={trayRef}><Tray data={data} chosen={chosen} onRemove={(id) => setSelected((prev) => prev.filter((s) => s !== id))} /></div>
          </div>
          <div className={styles.listHead}>
            <span className={styles.listHeadText}>
              <h2 className={styles.sectionTitle}>관심 주택 {homes.length}곳</h2>
              <span className={styles.listSub}>선택하면 위에서 바로 비교돼요</span>
            </span>
            <button type="button" className={styles.buttonPrimary} onClick={() => drawer.open({ mode: "new" })}>+ 관심 주택 등록</button>
          </div>
          <p className={styles.notice} role="status">{notice}</p>
          <ul className={styles.list}>
            {homes.map((home) => (
              <ListCard key={home.id} name={home.name} meta={homeMeta(home.housingType, home.exclusiveAreaM2)} cost={home.cost}
                selected={selected.includes(home.id)} expanded={expanded.includes(home.id)} deleting={deleting}
                onToggle={() => toggle(home.id)}
                onExpand={() => setExpanded((prev) => (prev.includes(home.id) ? prev.filter((e) => e !== home.id) : [...prev, home.id]))}
                onEdit={(focus) => drawer.open({ mode: "edit", id: home.id, input: home.input, focus })}
                onDelete={() => remove(home)} />
            ))}
          </ul>
        </>
      )}
      <CompareDrawer dialogRef={drawer.dialogRef} target={drawer.target} onClose={drawer.close} />
    </>
  );
}
