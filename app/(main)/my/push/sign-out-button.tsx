"use client";

import { useTransition } from "react";
import { signOut } from "@/app/(auth)/actions";
import styles from "@/app/_components/form.module.css";
import { removePushDevice } from "./actions";

/** spec 021 FR-007: 이 기기 웹 푸시를 끈 뒤 로그아웃. 끄기가 실패해도 로그아웃은 한다 */
async function turnOffThisDevice(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await removePushDevice(subscription.endpoint);
  await subscription.unsubscribe();
}

/** className: 위쪽 메뉴의 이름 메뉴 안에서는 메뉴 줄 모양으로 쓴다 (spec 022 FR-010) */
export function SignOutButton({ className = styles.primary }: { className?: string }) {
  const [busy, startTransition] = useTransition();
  return (
    <button type="button" className={className} disabled={busy}
      onClick={() => startTransition(async () => {
        try {
          await turnOffThisDevice();
        } catch {
          // 로그아웃을 막지 않는다(FR-007). 남은 기기 줄은 다음 사람이 켜면 옮겨지고(E3), 만료되면 지워진다(E4)
        }
        await signOut();
      })}>
      {busy ? "로그아웃하는 중…" : "로그아웃"}
    </button>
  );
}
