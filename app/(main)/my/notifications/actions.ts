"use server";

import { redirect } from "next/navigation";
import { normalizeSlackEmail, UNAVAILABLE } from "@/incident/notify";
import { lookupSlackUser, postSlackMessage, slackConfigured } from "@/incident/notify.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, currentUserId } from "@/lib/supabase/server";

export type NotifyState = { error?: string; done?: string; email?: string };

async function userOrLogin(): Promise<string> {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  return userId;
}

/** FR-018 (spec 001 v0.3): 슬랙 이메일 저장. 봇이 그 이메일의 슬랙 사람을 찾아야 저장한다. 서버 액션마다 로그인 확인 */
export async function saveSlackEmail(_prev: NotifyState, formData: FormData): Promise<NotifyState> {
  const userId = await userOrLogin();
  const input = String(formData.get("slackEmail") ?? "");
  if (!slackConfigured()) return { error: UNAVAILABLE, email: input };
  const parsed = normalizeSlackEmail(input);
  if (!parsed.ok) return { error: parsed.message, email: input };
  const found = await lookupSlackUser(parsed.email);
  if (!found.ok) return { error: found.message, email: input };
  // 12단계 리뷰 4번: 슬랙 사람 ID는 서버만 쓴다(마이그레이션 0008). 로그인은 위에서 확인했고, 본인 행만 쓴다
  const admin = createAdminClient();
  const { error } = await admin.from("notification_settings").upsert({
    user_id: userId, slack_email: parsed.email, slack_user_id: found.slackUserId, updated_at: new Date().toISOString(),
  });
  if (error) return { error: "저장하지 못했습니다. 잠시 뒤 다시 해 주세요.", email: input };
  return { done: "저장했습니다. 팀 슬랙에서 사람을 찾았습니다.", email: parsed.email };
}

/** FR-018: 켜기·끄기. 켜는 것이 알림 승인이고 켠 시각을 남긴다(CLAUDE.md 팀 작업 규칙) */
export async function setNotifications(enabled: boolean): Promise<NotifyState> {
  const userId = await userOrLogin();
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("notification_settings")
    .update(enabled ? { enabled: true, enabled_at: now, updated_at: now } : { enabled: false, updated_at: now })
    .eq("user_id", userId)
    .not("slack_user_id", "is", null)
    .select("user_id");
  if (error || !data?.length) return { error: "먼저 슬랙 이메일을 저장해 주세요." };
  return { done: enabled ? "슬랙 알림을 켰습니다. 이제부터 생기는 위험·기회 알림을 슬랙으로 보냅니다." : "슬랙 알림을 껐습니다." };
}

/** FR-018 수용 기준 4: 시험 메시지 */
export async function sendTestMessage(): Promise<NotifyState> {
  const userId = await userOrLogin();
  const supabase = await createClient();
  const { data } = await supabase.from("notification_settings").select("slack_user_id").eq("user_id", userId).maybeSingle();
  if (!data?.slack_user_id) return { error: "먼저 슬랙 이메일을 저장해 주세요." };
  const result = await postSlackMessage(data.slack_user_id, "[HomeFit] 시험 메시지입니다. 이 메시지가 보이면 위험·기회 알림을 받을 수 있습니다.");
  return result.ok ? { done: "보냈습니다. 슬랙 DM을 확인해 주세요." } : { error: "보내지 못했습니다. 잠시 뒤 다시 해 주세요." };
}
