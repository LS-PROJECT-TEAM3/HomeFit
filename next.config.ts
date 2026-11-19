import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // spec 012 Q3: 위키 챗봇은 배포 묶음 안의 wiki/ 파일을 바로 읽는다(DB 복사본 없음)
  outputFileTracingIncludes: { "/api/wiki-chat": ["./wiki/**/*.md"] },
  // spec 019 E5: 하자 사진(4MB 안)을 서버 액션으로 올린다. 기본 1MB, Vercel 함수 요청 한도 4.5MB에 맞춤
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
  async redirects() {
    // IA MY_030000_PG 내 정보는 첫 탭(공고·정책 조건)으로 보낸다
    return [{ source: "/my", destination: "/my/conditions", permanent: false }];
  },
};

export default nextConfig;
