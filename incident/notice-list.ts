// spec 022(캔버스 v2-s3-*, 현경 결정 2026-11-22): 맞춤 공고 목록. 내 조건 칩, 잠깐 좁히기(주소 값), 상태 묶음, 정렬. 순수 함수
import { parseConditionForm } from "@/incident/condition-form";
import { ALL_SUPPLY_TYPES, matchesCondition, type PolicyCondition, type TargetGroup } from "@/incident/match";
import type { MatchedNotice } from "@/incident/matched";
import type { Notice } from "@/watch/notice";

/** 조건에서 고를 수 있는 공급 유형(설정 > 공고/정책 조건과 같음) */
export const SUPPLY_TYPES = ["국민임대", "행복주택", "영구임대", "공공임대", "전세임대", "매입임대"] as const;

/** 주소(?sido=&sgg=&types=&rent=&age=)로 받은 잠깐 바꾼 조건. 없는 칸은 저장된 값 */
export type ConditionOverride = Partial<Record<"sido" | "sgg" | "types" | "rent" | "age" | "targets", string>>;

/** 대상 이름(화면 라벨은 "/"로 잇는다) */
export const TARGET_LABELS: Record<TargetGroup, string> = { youth: "청년/사회초년생", newlywed: "신혼/신생아", multichild: "다자녀", elderly: "고령자" };

/** 관심 없음 이유(목록·상세 팝업에서 하나 고름, 현경 결정 2026-11-22) */
export const IGNORE_REASONS = ["지역이 멀어요", "임대료가 높아요", "자격 조건이 맞지 않아요", "이미 다른 곳에 신청했어요", "기타"] as const;

export type NoticeGroup = "new" | "follow" | "ignore" | "closed";
export type NoticeSort = "deadline" | "recent";

const NO_DEADLINE_CHECK = "0000-01-01";
const DAY_MS = 86_400_000;

/** 저장된 조건에 주소 값을 덮어쓴다. 검사(parseConditionForm)에 걸리면 저장된 조건 그대로 */
export function applyOverride(saved: PolicyCondition, override: ConditionOverride): PolicyCondition {
  const sidoChanged = override.sido !== undefined && override.sido !== saved.sidoCode;
  const parsed = parseConditionForm({
    sidoCode: override.sido ?? saved.sidoCode,
    sigunguCode: override.sgg ?? (sidoChanged ? "" : saved.sigunguCode ?? ""),
    supplyTypes: override.types !== undefined ? override.types.split(",") : saved.supplyTypes,
    targetGroups: override.targets !== undefined ? override.targets.split(",").filter(Boolean) : saved.targetGroups,
    maxMonthlyRent: override.rent ?? (saved.maxMonthlyRent === null ? "" : String(saved.maxMonthlyRent)),
    age: override.age ?? (saved.age === null ? "" : String(saved.age)),
  });
  return parsed.ok ? parsed.value : saved;
}

/** 공급 유형 칸의 "N건": 공급 유형만 빼고 조건에 맞는 공고를 유형마다 센다(같은 공고 ID는 한 번) */
export function supplyTypeCounts(notices: readonly Notice[], condition: PolicyCondition): Record<string, number> {
  const anyType = { ...condition, supplyTypes: [ALL_SUPPLY_TYPES] };
  const seen = new Set<string>();
  const counts: Record<string, number> = {};
  for (const notice of notices) {
    if (seen.has(notice.announcementId) || notice.supplyType === null) continue;
    if (!matchesCondition(notice, anyType, NO_DEADLINE_CHECK)) continue;
    seen.add(notice.announcementId);
    counts[notice.supplyType] = (counts[notice.supplyType] ?? 0) + 1;
  }
  return counts;
}

/** 목록 칩 묶음. 마감 지난 공고는 결정과 상관없이 "마감" */
export function noticeGroup(item: MatchedNotice): NoticeGroup {
  if (item.expired) return "closed";
  return item.decision;
}

export function groupCounts(items: readonly MatchedNotice[]): Record<NoticeGroup | "all", number> {
  const counts = { all: items.length, new: 0, follow: 0, ignore: 0, closed: 0 };
  for (const item of items) counts[noticeGroup(item)] += 1;
  return counts;
}

/** 마감까지 남은 날(한국 날짜끼리). 마감일이 없으면 null */
export function daysLeft(applyEnd: string | null, today: string): number | null {
  if (applyEnd === null) return null;
  return Math.round((Date.parse(`${applyEnd}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);
}

/** deadline: 들어온 순서(listMatchedNotices의 마감 가까운 순) 그대로. recent: 공고일이 늦은 것부터 */
export function sortNotices<T extends { announcedOn: string | null }>(items: readonly T[], sort: NoticeSort): T[] {
  if (sort === "deadline") return [...items];
  return [...items].sort((a, b) => (b.announcedOn ?? "").localeCompare(a.announcedOn ?? ""));
}

/** 내 조건 칩 글자(v2-s3-pc "행복주택 외 1", "50만원 이하", "만 27세") */
export function conditionChips(condition: PolicyCondition, regionName: string): { region: string; types: string; rent: string; age: string; targets: string } {
  const types = condition.supplyTypes.includes(ALL_SUPPLY_TYPES) ? "전체"
    : condition.supplyTypes.length === 1 ? condition.supplyTypes[0] : `${condition.supplyTypes[0]} 외 ${condition.supplyTypes.length - 1}`;
  const rent = condition.maxMonthlyRent === null ? "제한 없음" : `${Math.round(condition.maxMonthlyRent / 10_000).toLocaleString("ko-KR")}만원 이하`;
  const groups = condition.targetGroups;
  const targets = groups.length === 0 ? "모두" : groups.length === 1 ? TARGET_LABELS[groups[0]] : `${TARGET_LABELS[groups[0]]} 외 ${groups.length - 1}`;
  return { region: regionName, types, rent, age: condition.age === null ? "입력 안 함" : `만 ${condition.age}세`, targets };
}
