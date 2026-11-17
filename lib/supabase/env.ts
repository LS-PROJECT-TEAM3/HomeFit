// 공개해도 되는 Supabase 설정(브라우저·서버 공용). 값은 .env.local / Vercel 환경변수에만 둔다.
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} 환경변수가 없습니다. .env.example을 보고 .env.local에 값을 넣어 주세요.`);
  }
  return value;
}

export const supabaseUrl = (): string =>
  required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);

export const supabasePublishableKey = (): string =>
  required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
