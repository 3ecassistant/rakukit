"use client";

import { createBrowserClient } from "@supabase/ssr";

// クライアントコンポーネント（"use client"）から使うSupabaseクライアント。
// anon keyのみを使用し、RLSの制約下で動作する。
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
