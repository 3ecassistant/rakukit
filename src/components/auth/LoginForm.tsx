"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction, type AuthActionState } from "@/lib/auth/actions";

const initialState: AuthActionState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-email" className="text-sm font-semibold text-zinc-800">
          メールアドレス
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          required
          disabled={pending}
          className="w-full rounded-lg border border-zinc-300 p-3 text-sm focus:border-red-400 focus:outline-none disabled:opacity-60"
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-password" className="text-sm font-semibold text-zinc-800">
          パスワード
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          required
          disabled={pending}
          className="w-full rounded-lg border border-zinc-300 p-3 text-sm focus:border-red-400 focus:outline-none disabled:opacity-60"
          placeholder="パスワード"
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
        {pending ? "ログイン中…" : "ログイン"}
      </button>

      <p className="text-sm text-zinc-500">
        アカウントをお持ちでない方は{" "}
        <Link href="/signup" className="text-red-600 hover:underline">
          新規登録
        </Link>
      </p>
    </form>
  );
}
