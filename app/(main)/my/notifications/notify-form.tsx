"use client";

import { useActionState, useState, useTransition } from "react";
import styles from "@/app/_components/form.module.css";
import { saveSlackEmail, sendTestMessage, setNotifications, type NotifyState } from "./actions";

type Props = { initialEmail: string; found: boolean; enabled: boolean };

function Message({ state }: { state: NotifyState }) {
  if (state.error) return <p className={styles.alert} role="alert">{state.error}</p>;
  if (state.done) return <p className={styles.notice} role="status">{state.done}</p>;
  return null;
}

// IA MY_030500_TB 알림 (FR-018, spec 001 v0.3)
export function NotifyForm({ initialEmail, found, enabled: initialEnabled }: Props) {
  const [saveState, saveAction, saving] = useActionState<NotifyState, FormData>(saveSlackEmail, {});
  const [other, setOther] = useState<NotifyState>({});
  const [busy, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(initialEnabled);
  const canUse = found || Boolean(saveState.done);
  const run = (action: () => Promise<NotifyState>) => startTransition(async () => setOther(await action()));

  return (
    <div className={styles.form}>
      <form action={saveAction} className={styles.form} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="slackEmail">팀 슬랙 이메일</label>
          <input id="slackEmail" name="slackEmail" type="email" autoComplete="email" className={styles.input}
            defaultValue={saveState.email ?? initialEmail} aria-describedby="slackEmail-help" />
          <p id="slackEmail-help" className={styles.help}>팀 슬랙 워크스페이스에서 쓰는 이메일입니다. 저장하면 HomeFit 봇이 그 사람을 찾습니다.</p>
        </div>
        <Message state={saveState} />
        <button type="submit" className={styles.primary} disabled={saving}>{saving ? "찾는 중…" : "저장"}</button>
      </form>

      <Message state={other} />
      <p>알림: <strong>{enabled ? "켜짐" : "꺼짐"}</strong>{enabled ? null : " (켜야 사건 알림을 보냅니다)"}</p>
      <div className={styles.checks}>
        <button type="button" className={styles.primary} disabled={busy || !canUse}
          onClick={() => run(async () => {
            const result = await setNotifications(!enabled);
            if (result.done) setEnabled(!enabled);
            return result;
          })}>
          {enabled ? "알림 끄기" : "알림 켜기"}
        </button>
        <button type="button" className={styles.primary} disabled={busy || !canUse}
          onClick={() => run(sendTestMessage)}>
          시험 메시지 보내기
        </button>
      </div>
    </div>
  );
}
