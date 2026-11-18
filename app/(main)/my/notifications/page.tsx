import { redirect } from "next/navigation";

// 사용자 요청(2026-11-18): 슬랙 알림 탭(IA MY_030500_TB)을 계정·알림(MY_030400_TB)에 합쳤다. 옛 주소로 와도 그 칸으로 보낸다
export default function NotificationsPage() {
  redirect("/my/account#slack");
}
