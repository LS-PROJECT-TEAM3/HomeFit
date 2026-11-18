import { connection } from "next/server";
import { Suspense } from "react";
import { signOut } from "@/app/(auth)/actions";
import { LoadError, Loading } from "@/app/_components/states";
import { UNAVAILABLE } from "@/incident/notify";
import { slackConfigured } from "@/incident/notify.server";
import { createClient, currentUserId } from "@/lib/supabase/server";
import { NotifyForm } from "../notifications/notify-form";
import styles from "../my.module.css";
import formStyles from "@/app/_components/form.module.css";

export const metadata = { title: "계정·알림 | HomeFit AI" };

async function AccountEmail() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = typeof data?.claims?.email === "string" ? data.claims.email : "알 수 없음";
  return <p>로그인한 이메일: {email}</p>;
}

async function SlackSettings() {
  await connection(); // 로그인한 사람마다 다르다
  // FR-018 수용 기준 6: 봇 토큰이 없으면 저장 버튼을 보이지 않는다
  if (!slackConfigured()) return <p role="status">{UNAVAILABLE}</p>;
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

// IA MY_030400_TB 계정·알림 (FR-001, FR-018). 사용자 요청(2026-11-18)으로 슬랙 알림 탭(MY_030500_TB)을 합침
export default function AccountPage() {
  return (
    <>
      <section className={styles.section} aria-labelledby="account-title">
        <h2 id="account-title">계정</h2>
        <Suspense fallback={<p role="status">불러오는 중…</p>}>
          <AccountEmail />
        </Suspense>
        <form action={signOut}>
          <button type="submit" className={formStyles.primary}>로그아웃</button>
        </form>
      </section>
      <section id="slack" className={styles.section} aria-labelledby="notify-title">
        <h2 id="notify-title">슬랙 알림</h2>
        <p>내 집에 결로 위험이 생기거나 팔로우한 공고가 바뀌어 위험·기회 알림이 만들어지면 팀 슬랙의 HomeFit 봇이 개인 메시지로 알려 드립니다. 슬랙 알림을 켜는 것이 알림을 받겠다는 승인입니다. 대응 계획은 지금처럼 하나씩 승인합니다.</p>
        <Suspense fallback={<Loading />}>
          <SlackSettings />
        </Suspense>
      </section>
    </>
  );
}
