import { connection } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { collectRent } from "@/watch/collect-rent.server";
import { rtmsApiFetcher } from "@/watch/rtms.server";

/**
 * spec 008 FR-002 (PRD FR-09): 전월세 실거래가 정기 수집 입구(한 달 1번). Vercel Cron이 Authorization: Bearer CRON_SECRET을 붙여 부른다.
 * 근거: https://vercel.com/docs/cron-jobs/manage-cron-jobs
 */
export const maxDuration = 300;

export async function GET(request: Request) {
  await connection();
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
  if (!serviceKey) return Response.json({ error: "DATA_GO_KR_SERVICE_KEY가 없습니다." }, { status: 500 });
  const summary = await collectRent({ db: createAdminClient(), makeFetcher: () => rtmsApiFetcher(serviceKey), trigger: "scheduled", now: new Date() });
  return Response.json(summary, { status: summary.status === "succeeded" ? 200 : 502 });
}
