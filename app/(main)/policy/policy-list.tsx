"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/app/_components/icons";
import type { PolicyKind } from "@/incident/policy-match";
import styles from "../notices/notices.module.css";

// spec 022(캔버스 v2-s3b-pc): 정책 목록. 종류 칩(건수), 정렬, 10건씩 더 보기. 줄 전체가 정책 상세 링크
export type PolicyRow = {
  id: string; title: string; kinds: PolicyKind[]; agency: string; ages: string;
  periodKind: "period" | "always" | "unknown"; days: number | null; deadline: string | null;
  /** spec 026 FR-002: 이 줄(같은 이름 묶음 포함)을 팔로우했는지 */
  followed: boolean;
};
type Sort = "deadline" | "recent";

const PAGE = 10;
const IMMINENT_DAYS = 3;
const KIND_LABELS: Record<PolicyKind, string> = { loan: "대출/이자", rent: "월세/전세 지원", housing: "주택/거주", dormitory: "기숙사" };
const KINDS = Object.keys(KIND_LABELS) as PolicyKind[];
const SORTS: [Sort, string][] = [["deadline", "마감이 가까운 순"], ["recent", "최근 등록 순"]];

const imminent = (row: PolicyRow) => row.periodKind === "period" && row.days !== null && row.days <= IMMINENT_DAYS;
function due(row: PolicyRow): [string, string] {
  if (row.periodKind === "always") return ["상시 신청", "마감 없음"];
  if (row.periodKind === "unknown" || row.days === null || !row.deadline) return ["공고문 확인", "신청 기간 확인"];
  return [row.days === 0 ? "오늘 마감" : `${row.days}일 남음`, `${row.deadline.slice(5).replace("-", ".")} 마감`];
}

export function PolicyList({ rows, followsFailed = false }: { rows: PolicyRow[]; followsFailed?: boolean }) {
  const [kind, setKind] = useState<PolicyKind | "all">("all");
  const [sort, setSort] = useState<Sort>("deadline");
  const [sortOpen, setSortOpen] = useState(false);
  const [shown, setShown] = useState(PAGE);
  // spec 026 FR-002: "팔로우 중"만 보기는 종류 거르기와 함께 쓴다
  const [onlyFollowed, setOnlyFollowed] = useState(false);
  const base = onlyFollowed ? rows.filter((r) => r.followed) : rows;
  const count = (k: PolicyKind | "all") => (k === "all" ? base.length : base.filter((r) => r.kinds.includes(k)).length);
  const followedCount = rows.filter((r) => r.followed).length;
  const visible = base.filter((r) => kind === "all" || r.kinds.includes(kind));
  // 최근 등록 순: 온통청년 정책 번호가 클수록 나중에 등록(spec 006, policy-match better()와 같은 기준)
  const ordered = sort === "recent" ? [...visible].sort((a, b) => b.id.localeCompare(a.id)) : visible;
  const page = ordered.slice(0, shown);
  return (
    <section className={styles.listSection} aria-labelledby="policy-list-title">
      <h2 id="policy-list-title" className={styles.listTitle}>정책 목록<span className={styles.listCount}>{rows.length}</span></h2>
      <div className={styles.toolbar}>
        <div role="group" aria-label="정책 종류" className={styles.filters}>
          {(["all", ...KINDS] as const).map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} className={`${styles.filter} ${kind === k ? styles.filterOn : ""}`} onClick={() => { setKind(k); setShown(PAGE); }}>
              {k === "all" ? "전체" : KIND_LABELS[k]}<span className={styles.filterCount}>{count(k)}</span>
            </button>
          ))}
          {followsFailed ? null : <button type="button" aria-pressed={onlyFollowed} className={`${styles.filter} ${onlyFollowed ? styles.filterOn : ""}`} onClick={() => { setOnlyFollowed((v) => !v); setShown(PAGE); }}>
            팔로우 중<span className={styles.filterCount}>{followedCount}</span>
          </button>}
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
        </div>
      </div>
      {followsFailed ? <p className={styles.emptyRow} role="status">팔로우 표시를 불러오지 못했어요. 잠시 뒤 새로고침해 주세요.</p> : null}
      {page.length === 0 ? <p className={styles.emptyRow}>{onlyFollowed && followedCount === 0 ? "팔로우한 정책이 없어요. 정책 상세에서 팔로우해 보세요." : "이 종류에 해당하는 정책이 없어요."}</p> : (
        <ul className={styles.rows}>
          {page.map((row) => {
            const [days, date] = due(row);
            return (
              <li key={row.id}>
                <Link href={`/policy/${encodeURIComponent(row.id)}`} className={`${styles.row} ${styles.rowLink}`}>
                  <span className={styles.rowMain}>
                    <span className={styles.badges}>
                      {row.kinds[0] ? <span className={`${styles.badge} ${styles.badgeMuted}`}>{KIND_LABELS[row.kinds[0]]}</span> : null}
                      {imminent(row) ? <span className={`${styles.badge} ${styles.badgeDeadline}`}>마감 임박</span> : null}
                      {row.followed ? <span className={`${styles.badge} ${styles.badgeFollow}`}>팔로우 중</span> : null}
                    </span>
                    <span className={styles.rowTitle}>{row.title}</span>
                    <span className={styles.rowMeta}>{row.agency}<span className={styles.bar} aria-hidden="true">|</span>{row.ages}</span>
                  </span>
                  <span className={styles.rowDue}>
                    <span className={`${styles.rowDays} ${imminent(row) ? styles.rowDaysUrgent : ""}`}>{days}</span>
                    <span className={styles.rowDate}>{date}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {ordered.length > shown ? <button type="button" className={styles.more} onClick={() => setShown((n) => n + PAGE)}>{ordered.length - shown}건 더 보기</button> : null}
    </section>
  );
}
