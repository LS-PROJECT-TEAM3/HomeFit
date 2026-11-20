"use server";

import { redirect } from "next/navigation";
import { parseSubscription, PUSH_UNAVAILABLE, pushOutcome } from "@/incident/web-push";
import { sendToDevice, webPushConfigured } from "@/incident/web-push.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, currentUserId } from "@/lib/supabase/server";

// spec 021 FR-001·FR-002·FR-006: 이 기기 웹 푸시 켜기·끄기·시험 알림. 서버 액션마다 로그인 확인
export type PushState = { error?: string; done?: string };

async function userOrLogin(): Promise<string> {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  return userId;
}

/**
 * FR-001: 이 기기를 알림 받을 곳으로 저장. 켜는 것이 알림 승인이다.
 * 같은 브라우저(받을 주소)는 한 줄이라, 다른 계정이 켰던 기기면 지금 계정으로 옮긴다(E3).
 * 옮길 때·다시 켤 때 켠 시각을 지금으로 바꿔, 켜기 전에 생긴 사건은 보내지 않는다(리뷰 2026-11-20)
 */
export async function savePushDevice(subscription: unknown): Promise<PushState> {
  const userId = await userOrLogin();
  if (!webPushConfigured()) return { error: PUSH_UNAVAILABLE };
  const parsed = parseSubscription(subscription);
  if (!parsed.ok) return { error: parsed.message };
  // 넣기·옮기기는 서버만 한다(0022: 사용자에게 넣기·바꾸기 권한 없음). 로그인은 위에서 확인했다
  const admin = createAdminClient();
  const { error } = await admin.from("push_subscriptions").upsert(
    { user_id: userId, endpoint: parsed.value.endpoint, p256dh: parsed.value.p256dh, auth: parsed.value.auth, created_at: new Date().toISOString() },
    { onConflict: "endpoint" },
  );
  if (error) return { error: "저장하지 못했습니다. 잠시 뒤 다시 켜 주세요." };
  return { done: "이 기기 웹 푸시를 켰습니다. 이제부터 생기는 위험·기회 알림을 이 기기로 보냅니다." };
}

/** FR-002: 이 기기만 끈다. 다른 기기와 슬랙은 그대로. 본인 줄만 지운다(RLS) */
export async function removePushDevice(endpoint: string): Promise<PushState> {
  const userId = await userOrLogin();
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", endpoint);
  if (error) return { error: "끄지 못했습니다. 잠시 뒤 다시 해 주세요." };
  return { done: "이 기기 웹 푸시를 껐습니다." };
}

/** 화면을 열 때: 이 브라우저의 받을 주소가 지금 계정에 켜져 있나 */
export async function isMyPushDevice(endpoint: string): Promise<boolean> {
  const userId = await userOrLogin();
  const supabase = await createClient();
  const { data } = await supabase.from("push_subscriptions").select("id").eq("user_id", userId).eq("endpoint", endpoint).maybeSingle();
  return Boolean(data);
}

/** FR-006: 이 기기로 시험 알림 하나. 사건 기록에는 남기지 않는다 */
export async function sendTestPush(endpoint: string): Promise<PushState> {
  const userId = await userOrLogin();
  if (!webPushConfigured()) return { error: PUSH_UNAVAILABLE };
  const supabase = await createClient();
  const { data } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId).eq("endpoint", endpoint).maybeSingle();
  if (!data) return { error: "이 기기 웹 푸시가 꺼져 있습니다. 먼저 켜 주세요." };
  const payload = JSON.stringify({ title: "[HomeFit] 시험 알림입니다", body: "이 알림이 보이면 위험·기회 알림을 이 기기로 받을 수 있습니다.", url: "/my/account#push" });
  const outcome = pushOutcome(await sendToDevice(data, payload));
  if (outcome === "sent") return { done: "보냈습니다. 이 기기 알림을 확인해 주세요." };
  if (outcome === "gone") {
    await supabase.from("push_subscriptions").delete().eq("id", data.id);
    return { error: "이 기기는 더 이상 알림을 받을 수 없습니다. 끄고 다시 켜 주세요." };
  }
  return { error: "보내지 못했습니다. 잠시 뒤 다시 해 주세요." };
}
