"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Icon } from "@/app/_components/icons";
import { InfoTip } from "@/app/_components/info-tip";
import { DEFECT_KINDS } from "@/incident/defect-form";
import { DefectForm, DeleteDefectButton } from "./defect-form";
import type { Defect } from "./load-defects";
import styles from "../qc.module.css";

// spec 019 FR-002·003 → spec 022 FR-011(캔버스 v2-qc-log-pc): 하자 기록 타임라인. 3건까지 보이고 나머지는 "더보기".
// 줄을 누르면 사진과 삭제가 펼쳐지고, "+ 기록 추가"는 옆 창(네이티브 dialog)에서 넣는다. 원인·책임·안전 판정과 하자 예측은 하지 않는다
const SHOWN = 3;
const dot = (date: string) => date.replaceAll("-", ".");

function DefectItem({ defect, open, onToggle }: { defect: Defect; open: boolean; onToggle: () => void }) {
  const kind = DEFECT_KINDS[defect.kind];
  return (
    <li className={styles.timelineItem}>
      <span aria-hidden="true" className={styles.timelineDot} />
      <span aria-hidden="true" className={styles.timelineLine} />
      <div className={styles.timelineBody}>
        <button type="button" className={styles.timelineButton} aria-expanded={open} onClick={onToggle} aria-label={`${kind} ${dot(defect.occurredOn)} 기록 ${open ? "접기" : "보기"}`}>
          <span className={styles.timelineMeta}><span className={styles.kindChip}>{kind}</span>{dot(defect.occurredOn)}</span>
          <span className={styles.timelineMemo}>{defect.memo}</span>
          <span className={`${styles.timelineArrow} ${open ? styles.arrowDown : ""}`}><Icon name="chevron-right" size={18} /></span>
        </button>
        {open ? (
          <div className={styles.timelineMore}>
            {/* eslint-disable-next-line @next/next/no-img-element -- 서명 주소는 10분 뒤 사라져 이미지 최적화 캐시에 맞지 않는다 */}
            {defect.photoUrl ? <a href={defect.photoUrl} target="_blank" rel="noreferrer"><img src={defect.photoUrl} alt={`${dot(defect.occurredOn)} ${kind} 사진`} width={120} height={120} className={styles.thumb} /></a> : <span className={styles.help}>사진 없음</span>}
            <DeleteDefectButton id={defect.id} />
          </div>
        ) : null}
      </div>
    </li>
  );
}

export function DefectPanel({ hasHome, defects, today }: { hasHome: boolean; defects: Defect[]; today: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const close = () => dialogRef.current?.close();
  const shown = showAll ? defects : defects.slice(0, SHOWN);
  return (
    <section className={styles.card} aria-labelledby="defect-title">
      <div className={styles.logHead}>
        <span className={styles.logTitleRow}>
          <h2 id="defect-title" className={styles.cardTitle}>하자 기록</h2>
          <InfoTip icon text="하자 기록은 본인만 볼 수 있어요. 원인이나 책임은 판정하지 않아요." label="하자 기록 설명 보기" />
        </span>
        {hasHome ? <button type="button" className={styles.buttonPrimary} onClick={() => { setDrawerOpen(true); dialogRef.current?.showModal(); }}>+ 기록 추가</button> : null}
      </div>
      {!hasHome ? <p className={styles.emptyText}>내 집을 등록하면 하자를 날짜·사진과 남길 수 있어요. <Link href="/my/home">내 집 등록</Link></p>
        : defects.length === 0 ? <p className={styles.emptyText}>아직 하자 기록이 없어요</p> : (
          <>
            <ul className={styles.timeline} aria-label="하자 기록">
              {shown.map((d) => <DefectItem key={d.id} defect={d} open={openId === d.id} onToggle={() => setOpenId((prev) => (prev === d.id ? null : d.id))} />)}
            </ul>
            {defects.length > SHOWN ? (
              <button type="button" className={styles.moreButton} aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
                {showAll ? "접기" : "더보기"}<span className={showAll ? styles.arrowUp : undefined}><Icon name="chevron-down" size={18} /></span>
              </button>
            ) : null}
          </>
        )}
      {/* 네이티브 dialog: Esc로 닫히고, 닫으면 초점이 "+ 기록 추가"로 돌아간다 */}
      <dialog ref={dialogRef} className={styles.drawer} onClose={() => setDrawerOpen(false)}>
        {drawerOpen ? <DefectForm today={today} onSaved={close} onCancel={close} /> : null}
      </dialog>
    </section>
  );
}
