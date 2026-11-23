import { connection } from "next/server";
import { Suspense } from "react";
import { LoadError, Loading } from "@/app/_components/states";
import { UNAVAILABLE } from "@/incident/notify";
import { slackConfigured } from "@/incident/notify.server";
import { createClient, currentUserId } from "@/lib/supabase/server";
import { NotifyForm } from "../notifications/notify-form";
import { PUSH_UNAVAILABLE } from "@/incident/web-push";
import { webPushConfigured } from "@/incident/web-push.server";
import { PushSettings } from "../push/push-settings";
import styles from "./account.module.css";

export const metadata = { title: "알림 설정 | 설정 | HomeFit AI" };

async function SlackSettings() {
  await connection(); // 로그인한 사람마다 다르다
  // FR-018 수용 기준 6: 봇 토큰이 없으면 저장 버튼을 보이지 않는다
  if (!slackConfigured()) return <p role="status" className={styles.help}>{UNAVAILABLE}</p>;
  const userId = await currentUserId();
  if (!userId) return <LoadError>로그인이 끝났습니다. 다시 로그인해 주세요.</LoadError>;
  const supabase = await createClient();
  const [{ data, error }, claims] = await Promise.all([
    supabase.from("notification_settings").select("slack_email, slack_user_id, enabled").eq("user_id", userId).maybeSingle(),
    supabase.auth.getClaims(),
  ]);
  if (error) return <LoadError>알림 설정을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  // 처음에는 로그인 이메일을 넣어 둔다 (FR-018 수용 기준 1)
  const loginEmail = typeof claims.data?.claims?.email === "string" ? claims.data.claims.email : "";
  return <NotifyForm initialEmail={data?.slack_email ?? loginEmail} found={Boolean(data?.slack_user_id)} enabled={data?.enabled ?? false} />;
}

// spec 021 FR-001 E6: 키가 없으면 켜기 버튼 대신 안내
async function PushSection() {
  await connection();
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!webPushConfigured() || !publicKey) return <p role="status" className={styles.help}>{PUSH_UNAVAILABLE}</p>;
  return <PushSettings publicKey={publicKey} />;
}

function Row({ id, title, description, children }: { id: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section id={id} className={styles.row} aria-labelledby={`${id}-title`}>
      <div>
        <h2 id={`${id}-title`} className={styles.rowTitle}>{title}</h2>
        <p className={styles.rowDesc}>{description}</p>
      </div>
      <div className={styles.rowBody}>
        <Suspense fallback={<Loading />}>{children}</Suspense>
      </div>
    </section>
  );
}

// IA MY_030400_TB 알림 설정(v1.17, 옛 계정·알림. FR-001, FR-018, spec 021). spec 022 FR-014(캔버스 v2-settings-alert-pc): 슬랙·웹 푸시 두 줄.
// 로그아웃·로그인 이메일은 위쪽 메뉴의 이름 메뉴로 옮김(IA v1.17)
export default function AccountPage() {
  return (
    <div className={styles.card}>
      {/* 켜는 것이 알림 승인(CLAUDE.md, PRD FR-37·FR-35). 대응은 지금처럼 하나씩 승인 */}
      <Row id="slack" title="슬랙 알림" description="팀 슬랙으로도 알림을 받고 싶을 때 켜요. 켜는 것이 알림을 받겠다는 승인이에요.">
        <SlackSettings />
      </Row>
      <Row id="push" title="웹 푸시 알림" description="켜는 것이 알림을 받겠다는 승인이에요. 대응은 하나씩 승인해요.">
        <PushSection />
      </Row>
    </div>
  );
}
