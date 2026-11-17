"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; notice?: string };

function readCredentials(formData: FormData): { email: string; password: string } {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

const MIN_PASSWORD = 8;

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
