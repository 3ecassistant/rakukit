"use server";

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export interface AuthActionState {
  error?: string;
  confirmationRequired?: boolean;
}

// ログイン/サインアップ直後にworkspaceが存在することを保証する (■30-33, ■54と同様の
// 「必要になった時点で作る」方針をworkspaceにも適用)。
// 既存workspaceがあればそれを返し、なければ新規作成する。
async function ensureWorkspace(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (membership?.workspace_id) return membership.workspace_id as string;

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .insert({ name: "マイワークスペース", owner_user_id: userId })
    .select("id")
    .single();

  if (error || !workspace) {
    throw error ?? new Error("failed to create workspace");
  }

  return workspace.id as string;
}

function describeAuthError(message: string): string {
  if (message.includes("already registered") || message.includes("already exists")) {
    return "このメールアドレスはすでに登録されています";
  }
  if (message.includes("Password should be")) {
    return "パスワードは8文字以上で入力してください";
  }
  if (message.includes("Invalid login credentials")) {
    return "メールアドレスまたはパスワードが正しくありません";
  }
  return "処理に失敗しました。入力内容をご確認ください。";
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "メールアドレスとパスワードを入力してください" };
  }
  if (password.length < 8) {
    return { error: "パスワードは8文字以上で入力してください" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: describeAuthError(error.message) };
  }

  // メール確認が必須のプロジェクト設定では、この時点でsessionが発行されない (■52)
  if (!data.session || !data.user) {
    return { confirmationRequired: true };
  }

  await ensureWorkspace(supabase, data.user.id);
  redirect("/account");
}

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "メールアドレスとパスワードを入力してください" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: "メールアドレスまたはパスワードが正しくありません" };
  }

  await ensureWorkspace(supabase, data.user.id);
  redirect("/account");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
