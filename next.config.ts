import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // spec 012 Q3: 위키 챗봇은 배포 묶음 안의 wiki/ 파일을 바로 읽는다(DB 복사본 없음)
  outputFileTracingIncludes: { "/api/wiki-chat": ["./wiki/**/*.md"] },
  async redirects() {
    // IA MY_030000_PG 내 정보는 첫 탭(공고·정책 조건)으로 보낸다
    return [{ source: "/my", destination: "/my/conditions", permanent: false }];
  },
};

export default nextConfig;
