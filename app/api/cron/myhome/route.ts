import { connection } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { collectMyhome } from "@/watch/collect.server";
import { myhomeApiFetcher, type PageFetcher } from "@/watch/myhome.server";
import { fixtureFetcher, isFixtureName } from "@/watch/sim-fixtures";

/**
 * FR-003 (spec 001): 마이홈 정기 수집 입구. Vercel Cron이 Authorization: Bearer CRON_SECRET을 붙여 부른다.
 * 근거: https://vercel.com/docs/cron-jobs/manage-cron-jobs
 * 개발 중에는 ?fixture=sample 처럼 가짜 응답 묶음으로 돌릴 수 있다(운영 배포에서는 막음).
 */
export async function GET(request: Request) {
  await connection(); // 요청마다 새로 돈다(Cache Components에서 미리 그리지 않음)

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const fixture = new URL(request.url).searchParams.get("fixture");
  let fetchPage: PageFetcher;
  if (fixture) {
    if (process.env.NODE_ENV === "production" || !isFixtureName(fixture)) {
      return Response.json({ error: "가짜 응답 묶음은 개발 환경에서만, 정해진 이름으로만 쓸 수 있습니다." }, { status: 400 });
    }
    fetchPage = fixtureFetcher(fixture);
  } else {
    const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
    if (!serviceKey) return Response.json({ error: "DATA_GO_KR_SERVICE_KEY가 없습니다." }, { status: 500 });
    fetchPage = myhomeApiFetcher(serviceKey);
  }

  const summary = await collectMyhome({
    db: createAdminClient(),
    fetchPage,
    trigger: fixture ? "simulation" : "scheduled",
    now: new Date(),
  });
  return Response.json(summary, { status: summary.status === "succeeded" ? 200 : 502 });
}
