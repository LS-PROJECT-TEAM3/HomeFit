import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    // IA MY_030000_PG 내 정보는 첫 탭(공고·정책 조건)으로 보낸다
    return [{ source: "/my", destination: "/my/conditions", permanent: false }];
  },
};

export default nextConfig;
