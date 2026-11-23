import styles from "./form.module.css";

// spec 022(캔버스 v2-set-saved-pc): "저장했습니다 11.20 14:05 | 다음 알림부터 바뀐 정보로 맞춰 드려요". 시각은 저장 결과를 그린 때(한국 시각)
export function SavedNotice({ message = "저장했습니다" }: { message?: string }) {
  const time = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }).slice(5, 16).replace("-", ".");
  return (
    <p className={styles.notice} role="status">
      {message}<span className={styles.noticeTime}>{time} | 다음 알림부터 바뀐 정보로 맞춰 드려요</span>
    </p>
  );
}
