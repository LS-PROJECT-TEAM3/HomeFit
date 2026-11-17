import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HomeFit AI",
  description: "사회초년생에게 맞는 주거 지원 공고·정책과 주거 변화를 알려 주는 서비스",
};

// 한글 글꼴은 Pretendard를 먼저 쓴다 (.claude/rules/design.md 2). 버전을 고정한 CDN 주소
const pretendardHref =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" href={pretendardHref} />
      </head>
      <body>{children}</body>
    </html>
  );
}
