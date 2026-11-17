import { PROVIDER_NAMES, type ProviderName } from "@/lib/llm/types";

export type Selection = { ok: true; name: ProviderName } | { ok: false; message: string };

/**
 * FR-001 (spec 002): AI_PROVIDER 값으로 공급자를 고른다.
 * 비었을 때 개발·시험은 mock(실제 API를 부르지 않음), 운영은 조용히 고르지 않고 "설정 없음"으로 실패한다.
 */
export function selectProvider({ value, isProduction }: { value: string | undefined; isProduction: boolean }): Selection {
  const name = (value ?? "").trim().toLowerCase();
  if (name === "") return isProduction ? { ok: false, message: "AI 설정 없음" } : { ok: true, name: "mock" };
  if ((PROVIDER_NAMES as readonly string[]).includes(name)) return { ok: true, name: name as ProviderName };
  return { ok: false, message: `모르는 AI 공급자: ${name}` };
}
