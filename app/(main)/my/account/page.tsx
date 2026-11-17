import { Suspense } from "react";
import { signOut } from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/server";
import styles from "../my.module.css";
import formStyles from "@/app/_components/form.module.css";

export const metadata = { title: "계정 | HomeFit AI" };

async function AccountEmail() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = typeof data?.claims?.email === "string" ? data.claims.email : "알 수 없음";
  return <p>로그인한 이메일: {email}</p>;
}

// IA MY_030400_TB 계정: 로그아웃 (FR-001, spec 001). 탈퇴는 이번 spec 범위 밖
export default function AccountPage() {
  return (
    <section className={styles.section} aria-labelledby="account-title">
      <h2 id="account-title">계정</h2>
      <Suspense fallback={<p role="status">불러오는 중…</p>}>
        <AccountEmail />
      </Suspense>
      <form action={signOut}>
        <button type="submit" className={formStyles.primary}>로그아웃</button>
      </form>
    </section>
  );
}
