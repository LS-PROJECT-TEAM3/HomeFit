"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { MIN_PASSWORD, checkEmail, checkNewPassword } from "@/lib/supabase/auth-rules";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; notice?: string };

function readCredentials(formData: FormData): { email: string; password: string } {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

// FR-001 (spec 001) 로그인
export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: "이메일과 비밀번호를 모두 입력해 주세요." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "이메일 또는 비밀번호가 맞지 않습니다. 다시 입력해 주세요." };
  redirect("/");
}

// FR-001 (spec 001) 가입. 이메일 확인이 켜져 있으면 세션이 없어 안내만 한다
export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!email) return { error: "이메일을 입력해 주세요. 예: name@example.com" };
  if (password.length < MIN_PASSWORD) {
    return { error: `비밀번호는 ${MIN_PASSWORD}자 이상이어야 합니다. 다시 입력해 주세요.` };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: "가입하지 못했습니다. 이미 가입한 이메일인지 확인하거나 잠시 뒤 다시 시도해 주세요." };
  if (!data.session) return { notice: "확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해 주세요." };
  redirect("/onboarding");
}

// FR-001 (spec 001) 로그아웃
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const RESET_SENT = "입력한 주소로 가입되어 있으면 비밀번호 재설정 메일을 보냈습니다. 메일의 링크를 이 브라우저에서 열어 주세요.";

// spec 014 FR-001: 재설정 메일 요청. 가입 여부와 상관없이 같은 안내(E2, SC-004)
export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const invalid = checkEmail(email);
  if (invalid) return { error: invalid };
  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/confirm?next=/reset-password/new` });
  // E3: 요청이 너무 잦으면 Supabase가 429로 막는다. 그 밖의 오류도 가입 여부를 드러내지 않게 같은 안내
  if (error?.status === 429) return { error: "메일 요청이 너무 잦습니다. 잠시 뒤 다시 요청해 주세요." };
  if (error) console.error("비밀번호 재설정 메일 요청 실패", error.status ?? "상태 없음");
  return { notice: RESET_SENT };
}

// spec 014 FR-002: 메일 링크로 로그인된 상태에서 새 비밀번호 저장
export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const invalid = checkNewPassword(password, String(formData.get("confirm") ?? ""));
  if (invalid) return { error: invalid };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "새 비밀번호를 저장하지 못했습니다. 메일을 다시 요청해 새 링크로 시도해 주세요." };
  redirect("/");
}
