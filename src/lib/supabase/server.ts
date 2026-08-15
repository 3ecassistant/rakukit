import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server Component / Route Handler / Server Action から使うSupabaseクライアント。
// anon keyを使い、ログイン中ユーザーのRLSの制約下で動作する（■153, ■290）。
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Componentのレンダリング中はcookieを書き込めない。
            // src/proxy.ts がリクエストごとにセッションをリフレッシュしているため無視してよい。
          }
        },
      },
    }
  );
}
