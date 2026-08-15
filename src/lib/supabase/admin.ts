import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// service_role keyはRLSを完全にバイパスする特権クライアント。
// Stripe Webhookハンドラなど、サーバー専用コードでのみ使用する。
// "server-only" によりクライアントバンドルへ誤って含まれた場合にビルドエラーとなる（■149, ■151）。
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
