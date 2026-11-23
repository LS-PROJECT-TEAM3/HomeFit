"use client";

import { useActionState, useState, useTransition } from "react";
import { Toggle } from "../account/toggle";
import styles from "../account/account.module.css";
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

  const toggle = () => run(async () => {
    const result = await setNotifications(!enabled);
    if (result.done) setEnabled(!enabled);
    return result;
  });

  // spec 022 FR-014(v2-settings-alert-pc): 스위치 → 안내 → 팀 슬랙 이메일. 켜기·저장·시험은 누르면 바로 한다(한꺼번에 저장하지 않음)
  return (
    <>
      <Toggle label="슬랙 알림" on={enabled} disabled={busy || !canUse} onClick={toggle} />
      <p className={styles.sub}>{!canUse ? "먼저 팀 슬랙 이메일을 저장해 주세요." : enabled ? "새 알림이 오면 슬랙으로도 알려 드려요" : "켜야 위험·기회 알림을 슬랙으로 보내요"}</p>
      <Message state={other} />
      <form action={saveAction} className={styles.field} noValidate>
        <label className={styles.label} htmlFor="slackEmail">팀 슬랙 이메일</label>
        <div className={styles.inputRow}>
          <input id="slackEmail" name="slackEmail" type="email" autoComplete="email" className={styles.input}
            defaultValue={saveState.email ?? initialEmail} aria-describedby="slackEmail-help" />
          <button type="submit" className={styles.primary} disabled={saving}>{saving ? "찾는 중…" : "저장"}</button>
        </div>
        <p id="slackEmail-help" className={styles.help}>슬랙에서 쓰는 이메일을 넣어 주세요. 저장하면 HomeFit 봇이 그 사람을 찾아요.</p>
        <Message state={saveState} />
      </form>
      <div className={styles.actions}>
        <button type="button" className={styles.assistive} disabled={busy || !canUse} onClick={() => run(sendTestMessage)}>시험 메시지 보내기</button>
      </div>
    </>
  );
}
