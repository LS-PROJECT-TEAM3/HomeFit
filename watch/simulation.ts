import type { RunTrigger } from "@/watch/run-log.server";

// 사용자 결정(2026-11-18): 시뮬레이션(가짜 공고·가짜 예보)은 가상(시험) 계정에만 돈다.
// 실제 계정은 나중에 사용자가 실제로 쓸 계정이라 가짜 사건·계획·일정이 생기면 안 된다. 순수 함수

/** 환경변수 SIMULATION_USER_IDS(쉼표로 나눈 회원 ID) → 집합. 회원 ID는 비밀이 아니다 */
export function parseVirtualUserIds(raw: string | undefined): Set<string> {
  return new Set((raw ?? "").split(",").map((id) => id.trim()).filter((id) => id !== ""));
}

/** 시뮬레이션이면 가상 계정만 남긴다. 목록이 비면 아무도 남지 않는다(실제 계정을 지키는 쪽) */
export function onlyVirtualWhenSimulating<T extends { userId: string }>(items: readonly T[], trigger: RunTrigger, virtualIds: ReadonlySet<string>): T[] {
  if (trigger !== "simulation") return [...items];
  return items.filter((item) => virtualIds.has(item.userId));
}

/** 가짜 공고는 외부 ID가 SIM- 으로 시작한다(watch/sim-fixtures.ts) */
export function isSimulatedNotice(externalId: string): boolean {
  return externalId.startsWith("SIM-");
}
