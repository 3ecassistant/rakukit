import "server-only";

import Stripe from "stripe";

// STRIPE_SECRET_KEYはクライアントバンドルに含めない (■150)。このファイルは
// "server-only" によりクライアントコンポーネントからimportされた場合にビルドエラーとなる。
//
// クライアントの生成は遅延させ、関数呼び出し時(リクエスト時)まで行わない。
// トップレベルでnew Stripe()すると、Next.jsがビルド時に各Route Handlerを
// モジュール解析のためimportした時点で実行されてしまい、STRIPE_SECRET_KEY未設定の
// ビルド環境（例: 環境変数未設定のままの初回Vercelデプロイ）でビルド自体が失敗する。
let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    stripeClient = new Stripe(secretKey, {
      apiVersion: "2026-07-29.dahlia",
    });
  }
  return stripeClient;
}
