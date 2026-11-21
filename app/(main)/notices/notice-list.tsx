"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Icon } from "@/app/_components/icons";
import type { FollowDecision } from "@/incident/matched";
import { sortNotices, type NoticeGroup, type NoticeSort } from "@/incident/notice-list";
import { decideNotices } from "./[id]/actions";
import styles from "./notices.module.css";

// spec 022(캔버스 v2-s3-pc·s3-select-pc·s3-skip-pc, 현경 결정 2026-11-22): 공고 목록. 상태 칩, 정렬, 여러 개 선택, 줄마다 팔로우·관심 없음.
// 관심 없음은 팝업에서 이유 하나를 골라 고른 공고 모두에 같이 저장한다
export type NoticeRow = {
  id: string; title: string; supplyType: string; region: string; group: NoticeGroup;
  days: number | null; deadline: string | null; announcedOn: string | null; simulated: boolean;
};

const PAGE = 10;
const IMMINENT_DAYS = 3;
const FILTERS: [NoticeGroup | "all", string][] = [["all", "전체"], ["new", "새 공고"], ["follow", "팔로우"], ["ignore", "관심 없음"], ["closed", "마감"]];
const SORTS: [NoticeSort, string][] = [["deadline", "마감이 가까운 순"], ["recent", "최근 공고 순"]];
const BADGE: Record<NoticeGroup, [string, string]> = { new: ["새 공고", styles.badgeNew], follow: ["팔로우", styles.badgeFollow], ignore: ["관심 없음", styles.badgeIgnored], closed: ["마감", styles.badgeClosed] };
const REASONS = ["지역이 멀어요", "임대료가 높아요", "자격 조건이 맞지 않아요", "이미 다른 곳에 신청했어요", "기타"];

const imminent = (row: NoticeRow) => row.group !== "closed" && row.days !== null && row.days <= IMMINENT_DAYS;
function dday(row: NoticeRow): string {
  if (row.group === "closed") return "접수 종료";
  if (row.days === null) return "공고문 확인";
  return row.days === 0 ? "오늘 마감" : `${row.days}일 남음`;
}

function Row({ row, selecting, checked, onCheck, onDecide }: { row: NoticeRow; selecting: boolean; checked: boolean; onCheck: () => void; onDecide: (d: FollowDecision) => void }) {
  const [badge, badgeClass] = BADGE[row.group];
  return (
    <li className={`${styles.row} ${checked ? styles.rowChecked : ""}`}>
      {selecting ? (
        <button type="button" role="checkbox" aria-checked={checked} aria-label={`${row.title} 고르기`} className={`${styles.rowCheck} ${checked ? styles.checkOn : ""}`} onClick={onCheck}>
          <span className={styles.checkBox} aria-hidden="true">{checked ? <Icon name="tick" size={16} /> : null}</span>
        </button>
      ) : null}
      <Link href={`/notices/${encodeURIComponent(row.id)}`} className={styles.rowMain}>
        <span className={styles.badges}>
          <span className={`${styles.badge} ${badgeClass}`}>{badge}</span>
          {imminent(row) ? <span className={`${styles.badge} ${styles.badgeDeadline}`}>마감 임박</span> : null}
          {row.simulated ? <span className={`${styles.badge} ${styles.badgeIgnored}`}>가짜 공고</span> : null}
        </span>
        <span className={styles.rowTitle}>{row.title}</span>
        <span className={styles.rowMeta}>{row.supplyType}<span className={styles.bar} aria-hidden="true">|</span>{row.region}</span>
      </Link>
      <span className={styles.rowDue}>
        <span className={`${styles.rowDays} ${imminent(row) ? styles.rowDaysUrgent : ""}`}>{dday(row)}</span>
        <span className={styles.rowDate}>{row.deadline ? `${row.deadline.slice(5).replace("-", ".")} 마감` : "마감일 공고문 확인"}</span>
      </span>
      {selecting ? null : (
        <span className={styles.rowActions}>
          <button type="button" className={`${styles.iconButton} ${row.group === "follow" ? styles.iconOn : ""}`} aria-label={row.group === "follow" ? `${row.title} 팔로우 중` : `${row.title} 팔로우`} title={row.group === "follow" ? "팔로우 중" : "팔로우"} aria-pressed={row.group === "follow"} disabled={row.group === "follow"} onClick={() => onDecide("follow")}><Icon name="bookmark" size={22} /></button>
          <button type="button" className={`${styles.iconButton} ${row.group === "ignore" ? styles.iconOn : ""}`} aria-label={row.group === "ignore" ? `${row.title} 관심 없음으로 표시함` : `${row.title} 관심 없음`} title={row.group === "ignore" ? "관심 없음으로 표시함" : "관심 없음"} aria-pressed={row.group === "ignore"} disabled={row.group === "ignore"} onClick={() => onDecide("ignore")}><Icon name="ban" size={22} /></button>
        </span>
      )}
    </li>
  );
}

export function NoticeList({ rows, counts }: { rows: NoticeRow[]; counts: Record<NoticeGroup | "all", number> }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [filter, setFilter] = useState<NoticeGroup | "all">("all");
  const [sort, setSort] = useState<NoticeSort>("deadline");
  const [sortOpen, setSortOpen] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [pendingIgnore, setPendingIgnore] = useState<string[]>([]);
  const [reason, setReason] = useState(REASONS[0]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const visible = rows.filter((r) => filter === "all" || r.group === filter);
  const ordered = sortNotices(visible, sort);
  const page = ordered.slice(0, shown);

  const run = (ids: string[], decision: FollowDecision, why = "") => startTransition(async () => {
    const result = await decideNotices(ids, decision, why);
    if (result.error) { setMessage(result.error); return; }
    setMessage(`${ids.length}개 공고를 ${decision === "follow" ? "팔로우" : "관심 없음"}으로 바꿨어요.`);
    setPicked([]);
    setSelecting(false);
    router.refresh();
  });
  const decide = (ids: string[], decision: FollowDecision) => {
    if (ids.length === 0) return;
    if (decision === "follow") { run(ids, "follow"); return; }
    setPendingIgnore(ids);
    setReason(REASONS[0]);
    dialog.current?.showModal();
  };
  const toggle = (id: string) => setPicked((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  return (
    <section className={styles.listSection} aria-labelledby="notice-list-title">
      <h2 id="notice-list-title" className={styles.listTitle}>공고 목록<span className={styles.listCount}>{counts.all}</span></h2>
      <div className={styles.toolbar}>
        <div role="group" aria-label="공고 보기" className={styles.filters}>
          {FILTERS.map(([key, label]) => (
            <button key={key} type="button" aria-pressed={filter === key} className={`${styles.filter} ${filter === key ? styles.filterOn : ""}`} onClick={() => { setFilter(key); setShown(PAGE); }}>
              {label}<span className={styles.filterCount}>{counts[key]}</span>
            </button>
          ))}
        </div>
        <div className={styles.tools}>
          <span className={styles.sortBox}>
            <button type="button" className={styles.sortButton} aria-haspopup="listbox" aria-expanded={sortOpen} onClick={() => setSortOpen((v) => !v)}>
              {SORTS.find(([k]) => k === sort)?.[1]}<Icon name="chevron-down" size={18} />
            </button>
            {sortOpen ? (
              <ul role="listbox" aria-label="정렬" className={styles.sortList}>
                {SORTS.map(([key, label]) => (
                  <li key={key} role="option" aria-selected={sort === key} tabIndex={0} className={styles.sortOption}
                    onClick={() => { setSort(key); setSortOpen(false); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSort(key); setSortOpen(false); } }}>{label}</li>
                ))}
              </ul>
            ) : null}
          </span>
          <button type="button" className={styles.selectButton} aria-pressed={selecting} onClick={() => { setSelecting((v) => !v); setPicked([]); }}>{selecting ? "선택 끝내기" : "선택"}</button>
        </div>
      </div>
      {selecting ? (
        <div className={styles.selectBar} role="region" aria-label="고른 공고 바꾸기">
          <b className={styles.selectCount}>{picked.length}개 선택됨</b>
          <button type="button" className={styles.selectAction} disabled={busy || picked.length === 0} onClick={() => decide(picked, "follow")}>팔로우로 바꾸기</button>
          <button type="button" className={styles.selectAction} disabled={busy || picked.length === 0} onClick={() => decide(picked, "ignore")}>관심 없음으로 바꾸기</button>
          <button type="button" className={styles.textButton} onClick={() => setPicked(picked.length === page.length ? [] : page.map((r) => r.id))}>{picked.length === page.length && page.length > 0 ? "선택 해제" : "전체 선택"}</button>
        </div>
      ) : null}
      {message ? <p role="status" className={styles.message}>{message}</p> : null}
      {page.length === 0 ? <p className={styles.emptyRow}>이 칸에 해당하는 공고가 없어요.</p> : (
        <ul className={styles.rows} aria-busy={busy}>
          {page.map((row) => <Row key={row.id} row={row} selecting={selecting} checked={picked.includes(row.id)} onCheck={() => toggle(row.id)} onDecide={(d) => decide([row.id], d)} />)}
        </ul>
      )}
      {ordered.length > shown ? <button type="button" className={styles.more} onClick={() => setShown((n) => n + PAGE)}>{ordered.length - shown}건 더 보기</button> : null}
      {/* 네이티브 dialog: Esc로 닫히고 초점이 누른 버튼으로 돌아간다 */}
      <dialog ref={dialog} className={styles.reasonDialog} aria-labelledby="reason-title">
        <form method="dialog" className={styles.reasonForm} onSubmit={() => run(pendingIgnore, "ignore", reason)}>
          <h2 id="reason-title" className={styles.reasonTitle}>관심 없는 이유를 골라 주세요</h2>
          <p className={styles.popHelp}>{pendingIgnore.length > 1 ? `고른 공고 ${pendingIgnore.length}개에 같은 이유로 저장해요.` : "이 공고에 저장해요."} 관심 없음 공고는 목록 아래에 모아 둬요.</p>
          <fieldset className={styles.reasons}>
            <legend className={styles.srOnly}>이유</legend>
            {REASONS.map((r) => (
              <label key={r} className={`${styles.reason} ${reason === r ? styles.reasonOn : ""}`}>
                <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} />{r}
              </label>
            ))}
          </fieldset>
          <div className={styles.popActions}>
            <button type="button" className={styles.cancel} onClick={() => dialog.current?.close()}>취소</button>
            <button type="submit" className={styles.popSubmit}>관심 없음으로 저장</button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
