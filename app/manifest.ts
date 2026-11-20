import type { MetadataRoute } from "next";

// spec 021 Q2: 홈 화면에 추가할 때 앱 이름·아이콘. 아이폰은 홈 화면에 추가한 뒤에만 웹 푸시를 켤 수 있다
// 색은 디자인 토큰(app/tokens.css)의 primary·배경과 같은 값
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HomeFit AI",
    short_name: "HomeFit",
    description: "사회초년생에게 맞는 주거 지원 공고·정책과 주거 변화를 알려 주는 서비스",
    lang: "ko",
    start_url: "/",
    display: "standalone",
    background_color: "#F8FAFC",
    theme_color: "#2563EB",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
