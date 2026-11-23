"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { Icon } from "@/app/_components/icons";
import { InfoTip } from "@/app/_components/info-tip";
import { checkedCount, checklistSnapshot, MOVE_IN_ITEMS, toStored, totalCount, type CustomItem, type MoveInChecklist as Checklist, type MoveInKey } from "@/incident/move-in-checklist";
import { AddCustomItem } from "./add-custom-item";
import { ChecklistItem } from "./checklist-item";
import { saveMoveInChecklist } from "./checklist/actions";
import styles from "./qc.module.css";

// spec 019 FR-001 (PRD FR-29) → spec 022 FR-011(캔버스 v2-qc-check-pc): 관심 주택 한 곳의 입주 전 점검. 저장하면 그 관심 주택에 남는다.
// spec 024(PRD FR-29 v1.22): 항목별 메모와 이 집에만 생기는 내 항목("+ 항목 추가"). 집 전체 메모는 그대로

export type CheckHome = { id: string; name: string; place: string; checklist: Checklist; note: string; savedAt: string };

const SHOWN_HOMES = 4;
/** "11.19 20:41"(한국 시각) */
function kst(iso: string): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
    .formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
}

function HomePicker({ homes, current }: { homes: CheckHome[]; current: CheckHome }) {
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  const list = all ? homes : homes.slice(0, SHOWN_HOMES);
  return (
    <section className={`${styles.card} ${styles.pickCard}`} aria-labelledby="pick-title">
      <span className={styles.logTitleRow}>
        <h2 id="pick-title" className={styles.cardTitle}>점검할 집</h2>
        <InfoTip icon text="직접 둘러보면서 체크하고 메모해 두세요." label="점검할 집 설명 보기" />
      </span>
      <div className={styles.pickRow}>
        <span className={styles.pickNames}>
          <span className={styles.pickName}>{current.name}</span>
          {current.place ? <span className={styles.pickPlace}>{current.place}</span> : null}
        </span>
        {homes.length > 1 ? (
          <button type="button" className={styles.pickButton} aria-expanded={open} aria-controls="pick-list" onClick={() => setOpen((v) => !v)}>
            다른 집 선택<span className={open ? styles.arrowUp : styles.arrowPlain}><Icon name="chevron-down" size={18} /></span>
          </button>
        ) : null}
      </div>
      {open ? (
        <div id="pick-list" className={styles.pickList}>
          <ul aria-label="점검할 집 목록">
            {list.map((h) => (
              <li key={h.id}>
                <Link href={`/qc/checklist?home=${h.id}`} className={`${styles.pickItem} ${h.id === current.id ? styles.pickItemOn : ""}`} aria-current={h.id === current.id ? "page" : undefined}>
                  <span className={styles.pickNames}><span className={styles.pickItemName}>{h.name}</span>{h.place ? <span className={styles.pickItemPlace}>{h.place}</span> : null}</span>
                  <span className={styles.pickCount}>{checkedCount(h.checklist)} / {totalCount(h.checklist)} 확인</span>
                </Link>
              </li>
            ))}
          </ul>
          {homes.length > SHOWN_HOMES ? (
            <div className={styles.pickMore}>
              <button type="button" className={styles.pickMoreButton} aria-expanded={all} onClick={() => setAll((v) => !v)}>
                {all ? "접기" : "더보기"}<span className={all ? styles.arrowUp : styles.arrowPlain}><Icon name="chevron-down" size={18} /></span>
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function MoveInChecklist({ homes, current }: { homes: CheckHome[]; current: CheckHome }) {
  const [state, formAction, pending] = useActionState(saveMoveInChecklist, {});
  // spec 024: 체크·항목 메모·내 항목을 한 상태로. 저장 실패 때도 입력은 그대로 남는다(E8)
  const [list, setList] = useState<Checklist>(current.checklist);
  const [note, setNote] = useState(current.note);
  // 2단계 리뷰: 키 순서와 상관없이 비교하고, 저장이 끝나면 "누른 순간"의 값을 저장된 값으로 둔다(저장 중에 고친 것은 변경으로 남김)
  const snapshot = checklistSnapshot(list) + "|" + note.trim();
  const [saved, setSaved] = useState(snapshot);
  const [submitted, setSubmitted] = useState(snapshot);
  const addButton = useRef<HTMLButtonElement>(null);
  const dirty = snapshot !== saved;
  const [lastSaved, setLastSaved] = useState(current.savedAt);
  if (state.savedAt && state.savedAt !== lastSaved && !pending) {
    setLastSaved(state.savedAt);
    setSaved(submitted);
  }
  const toggle = (key: MoveInKey) => setList((prev) => {
    const checked = { ...prev.checked };
    if (checked[key]) delete checked[key];
    else checked[key] = true;
    return { ...prev, checked };
  });
  const setItemNote = (key: MoveInKey, value: string) => setList((prev) => ({ ...prev, notes: { ...prev.notes, [key]: value } }));
  const changeCustom = (id: string, change: Partial<CustomItem>) =>
    setList((prev) => ({ ...prev, custom: prev.custom.map((item) => (item.id === id ? { ...item, ...change } : item)) }));
  const removeCustom = (id: string) => {
    setList((prev) => ({ ...prev, custom: prev.custom.filter((item) => item.id !== id) }));
    requestAnimationFrame(() => addButton.current?.focus()); // 지운 줄이 사라져도 키보드 위치를 잃지 않게
  };
  const addCustom = (item: { id: string; label: string }) => setList((prev) => ({ ...prev, custom: [...prev.custom, { ...item, checked: false, note: "" }] }));
  const customLabels = list.custom.map((item) => item.label);
  return (
    <>
      <HomePicker homes={homes} current={current} />
      {/* data-snap-section: 항목을 누르면 "점검 항목" 영역이 메뉴·탭 아래에 맞춰진다(focus-scroll.tsx) */}
      <form action={formAction} onSubmit={() => setSubmitted(snapshot)} className={styles.checkForm} aria-label={`${current.name} 입주 전 점검`} data-snap-section>
        <input type="hidden" name="homeId" value={current.id} />
        {/* spec 024: 저장 모양 JSON 하나로 보낸다. 서버가 다시 검사한다 */}
        <input type="hidden" name="checklist" value={JSON.stringify(toStored(list))} />
        <div className={styles.checkHead}>
          <h2 className={styles.cardTitle}>점검 항목</h2>
          <span className={styles.checkCount}>확인한 항목<span className={styles.checkNumber}>{checkedCount(list)}<span className={styles.checkTotal}> / {totalCount(list)}</span></span></span>
        </div>
        <ul className={styles.checkGrid}>
          {MOVE_IN_ITEMS.map((item) => {
            const [title, question] = item.label.split(": ");
            return (
              <ChecklistItem key={item.key} title={title} question={question} checked={Boolean(list.checked[item.key])} note={list.notes[item.key] ?? ""}
                onToggle={() => toggle(item.key)} onNote={(value) => setItemNote(item.key, value)} />
            );
          })}
          {list.custom.map((item) => (
            <ChecklistItem key={item.id} title={item.label} checked={item.checked} note={item.note}
              onToggle={() => changeCustom(item.id, { checked: !item.checked })} onNote={(value) => changeCustom(item.id, { note: value })}
              custom={{ others: customLabels, onRename: (label) => changeCustom(item.id, { label }), onRemove: () => removeCustom(item.id) }} />
          ))}
          <AddCustomItem existing={customLabels} onAdd={addCustom} buttonRef={addButton} />
          <li className={`${styles.checkItem} ${styles.checkNote}`} data-snap-section>
            <label htmlFor="move-in-note" className={styles.checkTitle}>메모</label>
            <textarea id="move-in-note" name="note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className={`${styles.input} ${styles.textarea}`} placeholder="예: 북향이라 오후에 어두움, 욕실 실리콘 교체 필요 (500자 안)" />
          </li>
        </ul>
        <div className={styles.saveBar}>
          <span className={styles.saveInfo} role="status">
            {state.error ? <span className={styles.saveWarn}>{state.error}</span> : dirty ? <span className={styles.saveWarn}>저장하지 않은 변경이 있어요</span> : null}
            <span>마지막 저장 {kst(lastSaved)}</span>
          </span>
          <button type="submit" className={styles.buttonPrimary} disabled={pending}>{pending ? "저장하는 중…" : "저장"}</button>
        </div>
      </form>
    </>
  );
}
