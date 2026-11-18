import { connection } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { collectYouthPolicies } from "@/watch/collect-youth.server";
import { youthPolicyApiFetcher } from "@/watch/youth-policy.server";

/**
 * spec 006 FR-001 (PRD FR-07): 온통청년 주거 정책 정기 수집 입구. Vercel Cron이 Authorization: Bearer CRON_SECRET을 붙여 부른다.
 * 근거: https://vercel.com/docs/cron-jobs/manage-cron-jobs
 */
export const maxDuration = 300;

export async function GET(request: Request) {
  await connection();
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const apiKey = process.env.YOUTH_POLICY_API_KEY;
  if (!apiKey) return Response.json({ error: "YOUTH_POLICY_API_KEY가 없습니다." }, { status: 500 });
  const summary = await collectYouthPolicies({ db: createAdminClient(), fetchPage: youthPolicyApiFetcher(apiKey), trigger: "scheduled" });
  return Response.json(summary, { status: summary.status === "succeeded" ? 200 : 502 });
}
