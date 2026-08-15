import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/lib/auth/actions";

export default async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-baseline gap-1.5">
          <span className="text-xl font-black tracking-tight text-red-700">RakuKit</span>
          <span className="hidden text-xs font-medium text-zinc-400 sm:inline">
            楽天市場出店者向けツール
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-4">
          <Link
            href="/blog"
            className="hidden text-sm text-zinc-500 transition-colors hover:text-red-600 sm:inline"
          >
            ブログ
          </Link>
          <Link
            href="/contact"
            className="hidden text-sm text-zinc-500 transition-colors hover:text-red-600 sm:inline"
          >
            お問い合わせ
          </Link>
          {user ? (
            <>
              <Link
                href="/account"
                className="hidden max-w-[10rem] truncate text-sm text-zinc-500 transition-colors hover:text-red-600 sm:inline"
              >
                {user.email}
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="text-sm text-zinc-500 transition-colors hover:text-red-600"
                >
                  ログアウト
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm text-zinc-500 transition-colors hover:text-red-600"
            >
              ログイン
            </Link>
          )}
          <Link
            href="/"
            className="rounded-full border border-red-600 px-4 py-1.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
          >
            ツール一覧
          </Link>
        </div>
      </div>
      <div className="h-0.5 bg-gradient-to-r from-red-700 via-red-500 to-gold-400" />
    </header>
  );
}
