import type { Metadata } from "next";
import { Cormorant_Garamond } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "HomeFit AI",
  description: "사회초년생에게 맞는 주거 지원 공고·정책과 주거 변화를 알려 주는 서비스",
};

// 한글 글꼴은 Pretendard를 먼저 쓴다 (.claude/rules/design.md 2). 버전을 고정한 CDN 주소
const pretendardHref =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

// 제목·큰 숫자는 Noto Serif KR (CLAUDE.md 디자인, spec 022 FR-008). 한글 글꼴은 조각 파일이 100개가 넘어
// next/font(Turbopack)가 만들지 못해 Pretendard처럼 스타일시트로 받는다
const serifHref = "https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;600;700&display=swap";

// 로고만 Cormorant Garamond. 빌드 때 받아 같은 서버에서 보낸다
const logo = Cormorant_Garamond({ weight: ["500", "600"], subsets: ["latin"], display: "swap", variable: "--font-logo-src" });

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={logo.variable}>
      <head>
        <link rel="stylesheet" href={pretendardHref} />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={serifHref} />
      </head>
      <body>{children}</body>
    </html>
  );
}
