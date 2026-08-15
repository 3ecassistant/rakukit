import "server-only";

import Stripe from "stripe";

// STRIPE_SECRET_KEYはクライアントバンドルに含めない (■150)。このファイルは
// "server-only" によりクライアントコンポーネントからimportされた場合にビルドエラーとなる。
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-07-29.dahlia",
});
