"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { collectMyhome } from "@/watch/collect.server";
import { collectWeather } from "@/watch/collect-weather.server";
import { collectYouthPolicies } from "@/watch/collect-youth.server";
import { collectRent } from "@/watch/collect-rent.server";
import { buildRentFixture, isRentFixtureName, RENT_LIVE } from "@/watch/rent-fixtures";
import { rtmsApiFetcher } from "@/watch/rtms.server";
import { youthPolicyApiFetcher } from "@/watch/youth-policy.server";
import { kmaApiFetcher } from "@/watch/kma.server";
import { myhomeApiFetcher } from "@/watch/myhome.server";
import { fixtureFetcher, isFixtureName } from "@/watch/sim-fixtures";
import { buildWeatherFixture, isWeatherFixtureName } from "@/watch/weather-fixtures";
import { requireAdmin } from "./guard";

export type RunResult =
  | { ok: true; runId: string; status: "succeeded" | "failed"; summary: string }
  | { ok: false; message: string };

type Source = "myhome" | "weather" | "rent";
/** 지금 한 번 실행만 되는 출처. 정책 가짜 묶음은 아직 없다(spec 006 Q2) */
type RunNowSource = Source | "youth";

function describe(summary: { status: string; newIncidents: number; updatedIncidents: number; error?: string }, read: string): string {
  if (summary.status === "failed") return summary.error ?? "이유 없음";
  return `${read}, 새 알림 ${summary.newIncidents}건, 바뀐 알림 ${summary.updatedIncidents}건`;
}

/** E1 (spec 005): 서버 동작은 화면과 따로 불릴 수 있어 여기서 다시 관리자인지 본다 */
async function denyUnlessAdmin(): Promise<RunResult | null> {
  try {
    return (await requireAdmin()) ? null : { ok: false, message: "관리자만 실행할 수 있습니다." };
  } catch {
    return { ok: false, message: "관리자인지 확인하지 못했습니다. 다시 로그인해 주세요." };
  }
}

function serviceKey(): string {
  const key = process.env.DATA_GO_KR_SERVICE_KEY;
  if (!key) throw new Error("공공데이터포털 키가 서버에 없습니다.");
  return key;
}

function youthKey(): string {
  const key = process.env.YOUTH_POLICY_API_KEY;
  if (!key) throw new Error("온통청년 키가 서버에 없습니다.");
  return key;
}

// spec 008 FR-007: 시세는 대상 수·거래 수로 요약
function describeRent(s: { status: string; targets: number; trades: number; newIncidents: number; error?: string }): string {
  const read = `대상 ${s.targets}곳, 실거래 ${s.trades}건 읽음, 새 알림 ${s.newIncidents}건`;
  return s.status === "failed" ? `${s.error ?? "이유 없음"} (${read})` : read;
}

async function runRentNow(): Promise<RunResult> {
  const key = serviceKey();
  const s = await collectRent({ db: createAdminClient(), makeFetcher: () => rtmsApiFetcher(key), trigger: "manual", now: new Date() });
  revalidatePath("/admin/watch");
  return { ok: true, runId: s.runId, status: s.status, summary: describeRent(s) };
}

// spec 006 FR-004: 정책은 사건을 만들지 않아 요약 문구가 다르다
async function runYouthNow(): Promise<RunResult> {
  const s = await collectYouthPolicies({ db: createAdminClient(), fetchPage: youthPolicyApiFetcher(youthKey()), trigger: "manual" });
  revalidatePath("/admin/watch");
  const summary = s.status === "failed" ? (s.error ?? "이유 없음") : `정책 ${s.policies}건 읽음, 새 정책 ${s.newPolicies}건, 바뀐 정책 ${s.changedPolicies}건`;
  return { ok: true, runId: s.runId, status: s.status, summary };
}

// spec 005 FR-001 (PRD FR-21, IA AD_070200_TB): 지금 한 번 실행. 실제 API로, 방식은 "손으로"
export async function runNow(source: RunNowSource): Promise<RunResult> {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  try {
    if (source === "youth") return await runYouthNow();
    if (source === "rent") return await runRentNow();
    const db = createAdminClient();
    const now = new Date();
    const result = source === "myhome"
      ? await collectMyhome({ db, fetchPage: myhomeApiFetcher(serviceKey()), trigger: "manual", now }).then((s) => ({ ...s, read: `공고 ${s.notices}건 읽음` }))
      : await collectWeather({ db, fetchForecast: kmaApiFetcher(serviceKey()), trigger: "manual", now }).then((s) => ({ ...s, read: `시군구 ${s.sigungu}곳 읽음` }));
    revalidatePath("/admin/watch");
    return { ok: true, runId: result.runId, status: result.status, summary: describe(result, result.read) };
  } catch (cause) {
    return { ok: false, message: cause instanceof Error ? cause.message : "실행하지 못했습니다." };
  }
}

// spec 005 FR-002 (PRD FR-24, IA AD_070500_TB): 가짜 묶음 실행. 사건은 가상 계정에게만 생긴다(watch/simulation.ts)
export async function runSimulation(input: { source: Source; fixture: string }): Promise<RunResult> {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const db = createAdminClient();
  const now = new Date();
  try {
    if (input.source === "myhome" && isFixtureName(input.fixture)) {
      const s = await collectMyhome({ db, fetchPage: fixtureFetcher(input.fixture), trigger: "simulation", now });
      return { ok: true, runId: s.runId, status: s.status, summary: describe(s, `가짜 공고 ${s.notices}건 읽음`) };
    }
    if (input.source === "weather" && isWeatherFixtureName(input.fixture)) {
      const name = input.fixture;
      const s = await collectWeather({ db, fetchForecast: async () => buildWeatherFixture(name, now), trigger: "simulation", now });
      return { ok: true, runId: s.runId, status: s.status, summary: describe(s, `가짜 예보 시군구 ${s.sigungu}곳`) };
    }
    // spec 008 FR-007: 실제 실거래가 API를 가상 계정 대상에만(실제 계정에 알림이 생기지 않게 실제 연결을 시연)
    if (input.source === "rent" && input.fixture === RENT_LIVE) {
      const key = serviceKey();
      const s = await collectRent({ db, makeFetcher: () => rtmsApiFetcher(key), trigger: "simulation", now });
      return { ok: true, runId: s.runId, status: s.status, summary: describeRent(s) };
    }
    if (input.source === "rent" && isRentFixtureName(input.fixture)) {
      const name = input.fixture;
      const s = await collectRent({ db, makeFetcher: (targets, firstMonth) => buildRentFixture(name, targets, firstMonth), trigger: "simulation", now });
      return { ok: true, runId: s.runId, status: s.status, summary: describeRent(s) };
    }
    return { ok: false, message: "정해진 가짜 묶음만 돌릴 수 있습니다." };
  } catch (cause) {
    return { ok: false, message: cause instanceof Error ? cause.message : "실행하지 못했습니다." };
  }
}
