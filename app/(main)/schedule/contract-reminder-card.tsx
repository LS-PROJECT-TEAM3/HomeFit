import Link from "next/link";
import type { ContractReminder } from "@/incident/contract-reminder";
import styles from "./schedule.module.css";

const GUIDE: Record<ContractReminder["state"], string> = {
  upcoming: "재계약할지, 이사할지 준비를 시작해 보세요. 만료일이 바뀌었으면 내 집에서 고쳐 주세요.",
  today: "오늘이 계약 만료일입니다. 재계약했다면 내 집에서 새 만료일을 넣어 주세요.",
  past: "만료일이 지났습니다. 재계약했거나 이사했다면 내 집에서 새 만료일을 넣어 주세요.",
};

// spec 013 FR-001~003: 승인한 계획과 다른 묶음. 사건·승인이 아니라 저장하지 않는 알림이다(PRD FR-31)
export function ContractReminderCard({ reminder }: { reminder: ContractReminder }) {
  return (
    <section aria-labelledby="contract-reminder-title" className={styles.group}>
      <h2 id="contract-reminder-title" className={styles.groupTitle}>계약 만료 알림</h2>
      <Link href="/my/home" className={`${styles.item} ${styles.reminder}`}>
        <span className={styles.itemTitle}>{reminder.label}</span>
        <span className={styles.meta}>만료일 {reminder.endDate} · 내 집 계약 정보에서 계산 (승인할 일 아님)</span>
        <span className={styles.meta}>{GUIDE[reminder.state]}</span>
      </Link>
    </section>
  );
}
