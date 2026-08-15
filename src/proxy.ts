import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Next.js 16では middleware.ts は廃止され proxy.ts に改名された
// (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md 参照)。
//
// Server Componentはcookieを書き込めないため、Supabaseのセッション(アクセストークン)を
// リクエストごとにここでリフレッシュしてcookieへ反映する。Supabase公式のNext.js SSR
// 連携パターンをそのまま proxy 命名に合わせて実装したもの。
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // トークンの有効期限切れをここで検知・更新する。副作用として呼び出すだけでよい。
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)",
  ],
};
