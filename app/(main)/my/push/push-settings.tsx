"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { Toggle } from "../account/toggle";
import styles from "../account/account.module.css";
import { PUSH_DENIED } from "@/incident/web-push";
import { isMyPushDevice, removePushDevice, savePushDevice, sendTestPush, type PushState } from "./actions";

// IA MY_030400_TB 알림 설정 > 웹 푸시 (spec 021 FR-001·FR-002·FR-006, spec 022 FR-014 v2-settings-alert-pc)

const UNSUPPORTED = "이 브라우저는 웹 푸시를 지원하지 않습니다.";
const IOS_HINT = "아이폰·아이패드는 사파리에서 공유 → 홈 화면에 추가를 한 뒤, 홈 화면의 HomeFit 아이콘으로 열면 켤 수 있습니다.";

function supportsPush(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// 브라우저 기능은 바뀌지 않으니 구독할 것이 없다. 서버에서 그릴 때는 null(확인 중)
const noSubscribe = () => () => {};
function useSupport(): boolean | null {
  return useSyncExternalStore(noSubscribe, supportsPush, () => null);
}

function isAppleMobile(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

/** 공개 키(base64url) → 브라우저가 받는 바이트 */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.register("/sw.js");
  return registration.pushManager.getSubscription();
}

function Message({ state }: { state: PushState }) {
  if (state.error) return <p className={styles.alert} role="alert">{state.error}</p>;
  if (state.done) return <p className={styles.notice} role="status">{state.done}</p>;
  return null;
}

export function PushSettings({ publicKey }: { publicKey: string }) {
  const support = useSupport();
  const [enabled, setEnabled] = useState(false);
  const [state, setState] = useState<PushState>({});
  const [busy, startTransition] = useTransition();

  // 화면을 열 때 이 브라우저가 지금 계정으로 켜져 있는지 본다
  useEffect(() => {
    if (!supportsPush()) return;
    currentSubscription()
      .then(async (subscription) => setEnabled(subscription ? await isMyPushDevice(subscription.endpoint) : false))
      .catch(() => setState({ error: "알림 상태를 확인하지 못했습니다. 페이지를 새로 고쳐 주세요." }));
  }, []);

  const run = (action: () => Promise<PushState>) => startTransition(async () => {
    try {
      setState(await action());
    } catch {
      setState({ error: "처리하지 못했습니다. 페이지를 새로 고친 뒤 다시 해 주세요." });
    }
  });

  const turnOn = async (): Promise<PushState> => {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { error: PUSH_DENIED };
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const subscription = (await registration.pushManager.getSubscription())
      ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
    const result = await savePushDevice(subscription.toJSON());
    if (result.done) setEnabled(true);
    return result;
  };

  const turnOff = async (): Promise<PushState> => {
    const subscription = await currentSubscription();
    if (!subscription) { setEnabled(false); return { done: "이 기기 웹 푸시를 껐습니다." }; }
    const result = await removePushDevice(subscription.endpoint);
    if (result.done) { await subscription.unsubscribe(); setEnabled(false); }
    return result;
  };

  const test = async (): Promise<PushState> => {
    const subscription = await currentSubscription();
    if (!subscription) return { error: "이 기기 웹 푸시가 꺼져 있습니다. 먼저 켜 주세요." };
    return sendTestPush(subscription.endpoint);
  };

  if (support === null) return <p role="status" className={styles.help}>불러오는 중…</p>;
  if (!support) {
    return <p role="status" className={styles.help}>{UNSUPPORTED}{isAppleMobile() ? ` ${IOS_HINT}` : ""}</p>;
  }
  return (
    <>
      <Toggle label="이 기기 웹 푸시" on={enabled} disabled={busy} onClick={() => run(enabled ? turnOff : turnOn)} />
      <p className={styles.sub}>이 기기 브라우저로 알림을 받아요. 기기마다 따로 켜요.</p>
      <Message state={state} />
      <div className={styles.actions}>
        <button type="button" className={styles.assistive} disabled={busy || !enabled} onClick={() => run(test)}>시험 알림 보내기</button>
      </div>
    </>
  );
}
