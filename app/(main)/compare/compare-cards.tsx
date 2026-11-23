"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/app/_components/icons";
import { completeTotal, diffFromMineText, type CostItemKey } from "@/incident/compare-tray";
import { HOUSING_LABELS, type HousingType } from "@/incident/home-form";
import type { RealCost } from "@/incident/real-cost";
import styles from "./compare.module.css";

// spec 022 FR-011, 캔버스 v2-compare-tray·list-none: 비교 현황 카드와 관심 주택 카드. 값은 보드 그대로

const ROWS: { key: CostItemKey; label: string }[] = [
  { key: "rent", label: "월세" }, { key: "fee", label: "관리비" }, { key: "energy", label: "에너지비" }, { key: "transit", label: "교통비" },
];

const won = (n: number) => n.toLocaleString("ko-KR");

export function homeMeta(housingType: HousingType, areaM2: number | null): string {
  return `${HOUSING_LABELS[housingType]}${areaM2 === null ? "" : ` 전용 ${areaM2}m²`}`;
}

/** 항목 네 줄. lowest면 초록 칠(색과 함께 굵기로도), 추정 에너지비는 "(예상)", 미입력은 글자로 */
export function CostRows({ cost, lowest }: { cost: RealCost; lowest?: Set<CostItemKey> }) {
  return (
    <div className={styles.rows}>
      {ROWS.map(({ key, label }) => {
        const item = cost[key];
        const best = lowest?.has(key) ?? false;
        return (
          <div key={key} className={`${styles.row} ${best ? styles.rowBest : ""}`}>
            <span className={styles.rowKey}>{key === "energy" && item.kind === "estimated" ? "에너지비 (예상)" : label}{best ? <span className={styles.srOnly}> (가장 낮음)</span> : null}</span>
            {item.value === null ? <span className={styles.rowMissing}>미입력</span> : <span className={styles.rowValue}>{won(item.value)}원</span>}
          </div>
        );
      })}
    </div>
  );
}

function Total({ cost, size }: { cost: RealCost; size: "tray" | "list" }) {
  const total = completeTotal(cost);
  if (total === null) return <span className={styles.noTotal}>합계 없음</span>;
  return <span className={size === "tray" ? styles.trayTotal : styles.listTotal}>{won(total)}<span className={styles.totalUnit}>원</span></span>;
}

type TrayCardProps = { name: string; meta: string; cost: RealCost; lowest: Set<CostItemKey>; mineTotal?: number | null; onRemove?: () => void };

/** 비교 현황 카드. 내 집은 "기준" 표시, 후보는 내 집 대비 차이와 빼기 버튼 */
export function TrayCard({ name, meta, cost, lowest, mineTotal, onRemove }: TrayCardProps) {
  const diff = onRemove ? diffFromMineText(completeTotal(cost), mineTotal ?? null) : null;
  return (
    <div className={styles.trayCard}>
      <div className={styles.cardHead}>
        <span className={styles.cardNames}>
          <span className={styles.nameLine}><span className={styles.trayName}>{name}</span>{onRemove ? null : <span className={styles.baseBadge}>기준</span>}</span>
          <span className={styles.meta}>{meta}</span>
        </span>
        {onRemove ? (
          <button type="button" className={styles.removeButton} aria-label={`${name} 빼기`} title="빼기" onClick={onRemove}><Icon name="close" size={20} /></button>
        ) : null}
      </div>
      <div className={styles.totalBlock}>
        <Total cost={cost} size="tray" />
        <span className={`${styles.diff} ${diff ? styles[`diff_${diff.tone}`] : ""}`}>{diff?.text ?? ""}</span>
      </div>
      <CostRows cost={cost} lowest={lowest} />
    </div>
  );
}

type ListCardProps = {
  name: string; meta: string; cost: RealCost; selected: boolean; expanded: boolean;
  onToggle: () => void; onExpand: () => void; onEdit: (focus?: "transit") => void; onDelete: () => void; deleting: boolean;
};

/** 관심 주택 카드. 고르면 위 비교 현황에 올라간다. 펼치면 항목과 고치기·삭제 */
/**
 * 사용자 요청(2026-11-21): 상세보기를 누르면 펼친 내용이 보이게 화면이 따라 내려가고, 접으면 펼치기 전 위치로 돌아간다.
 * 움직임 줄이기 설정이면 바로 옮긴다
 */
function useFollowExpand(expanded: boolean) {
  const cardRef = useRef<HTMLLIElement>(null);
  const beforeY = useRef<number | null>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const behavior: ScrollBehavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    if (expanded) {
      beforeY.current = window.scrollY;
      cardRef.current?.scrollIntoView({ block: "nearest", behavior });
    } else if (beforeY.current !== null) {
      window.scrollTo({ top: beforeY.current, behavior });
      beforeY.current = null;
    }
  }, [expanded]);
  return cardRef;
}

export function ListCard({ name, meta, cost, selected, expanded, onToggle, onExpand, onEdit, onDelete, deleting }: ListCardProps) {
  const transitMissing = cost.transit.value === null;
  const cardRef = useFollowExpand(expanded);
  return (
    <li ref={cardRef} className={`${styles.listCard} ${selected ? styles.listCardOn : ""}`}>
      <div className={styles.cardHead}>
        <span className={styles.cardNames}>
          <span className={styles.listName}>{name}</span>
          <span className={styles.meta}>{meta}</span>
        </span>
        <label className={styles.checkWrap}>
          <input type="checkbox" className={styles.srOnly} checked={selected} onChange={onToggle} aria-label={`${name} 비교에 넣기`} />
          <span className={styles.checkBox} aria-hidden="true">{selected ? <Icon name="tick" size={18} /> : null}</span>
        </label>
      </div>
      <div><Total cost={cost} size="list" /></div>
      <button type="button" className={styles.foldButton} aria-expanded={expanded} onClick={onExpand}>
        {expanded ? "접기" : "상세보기"}<span className={expanded ? styles.chevronUp : styles.chevron}><Icon name="chevron-down" size={18} /></span>
      </button>
      {expanded ? (
        <>
          <CostRows cost={cost} />
          <span className={styles.cardLinks}>
            {/* 사용자 요청(2026-11-21): 이름은 늘 "편집". 교통비가 비어 있으면 창에서 교통비 묶음을 펼쳐 둔다 */}
            <button type="button" className={styles.textButton} onClick={() => onEdit(transitMissing ? "transit" : undefined)}>편집</button>
            <button type="button" className={styles.textButton} onClick={onDelete} disabled={deleting}>{deleting ? "지우는 중…" : "삭제"}</button>
          </span>
        </>
      ) : null}
    </li>
  );
}
