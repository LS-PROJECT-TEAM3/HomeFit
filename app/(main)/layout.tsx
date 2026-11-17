import Link from "next/link";
import styles from "./main.module.css";

// IA 네비게이션 모델: 로그인한 사용자 화면의 주 메뉴. 집 비교·기록 찾기는 spec 001 범위 밖이라 아직 두지 않는다
const MENU = [
  { href: "/", label: "홈" },
  { href: "/incidents", label: "사건" },
  { href: "/schedule", label: "내 일정" },
  { href: "/my/conditions", label: "내 정보" },
];

export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>HomeFit AI</Link>
        <nav aria-label="주 메뉴">
          <ul className={styles.menu}>
            {MENU.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={styles.menuLink}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      {children}
    </>
  );
}
