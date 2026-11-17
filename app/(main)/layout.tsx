import Link from "next/link";
import styles from "./main.module.css";

// IA 네비게이션 모델: 로그인한 사용자 화면의 주 메뉴. 집 비교·집 점검·AI 도우미·관리자는 "전체 메뉴"에서 연다(spec 004)
const MENU = [
  { href: "/", label: "홈" },
  { href: "/incidents", label: "위험·기회 알림" }, // IA v1.4 화면 이름 (spec 003 FR-012)
  { href: "/notices", label: "맞춤 공고" }, // IA NT_080000_PG (spec 001 v0.2)
  { href: "/schedule", label: "내 일정" },
  { href: "/my/conditions", label: "내 정보" },
  { href: "/menu", label: "전체 메뉴" }, // spec 004: 기획안 9절 화면 모음(IA "더 보기")
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
