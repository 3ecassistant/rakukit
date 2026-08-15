"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpAction, type AuthActionState } from "@/lib/auth/actions";

const initialState: AuthActionState = {};

export default function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUpAction, initialState);

  if (state.confirmationRequired) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-6 py-10 text-center">
        <p className="text-lg font-bold text-red-800">確認メールを送信しました</p>
        <p className="text-sm text-zinc-600">
          メール内のリンクをクリックして登録を完了してください。
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="signup-email" className="text-sm font-semibold text-zinc-800">
          メールアドレス
        </label>
        <input
          id="signup-email"
          name="email"
          type="email"
          required
          disabled={pending}
          className="w-full rounded-lg border border-zinc-300 p-3 text-sm focus:border-red-400 focus:outline-none disabled:opacity-60"
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="signup-password" className="text-sm font-semibold text-zinc-800">
          パスワード
        </label>
        <input
          id="signup-password"
          name="password"
          type="password"
          required
          minLength={8}
          disabled={pending}
          className="w-full rounded-lg border border-zinc-300 p-3 text-sm focus:border-red-400 focus:outline-none disabled:opacity-60"
          placeholder="8文字以上"
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-gradient-to-b from-red-500 to-red-600 px-8 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:from-red-600 hover:to-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "登録中…" : "アカウント作成"}
      </button>

      <p className="text-sm text-zinc-500">
        すでにアカウントをお持ちの方は{" "}
        <Link href="/login" className="text-red-600 hover:underline">
          ログイン
        </Link>
      </p>
    </form>
  );
}
