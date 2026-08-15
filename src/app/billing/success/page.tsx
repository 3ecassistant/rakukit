import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "お支払い完了",
};

// StripeのCheckout成功URLへ戻ってきただけではPROを有効化しない。
// 課金状態の正はWebhookなので、ここでは案内のみ表示する (■69-72)。
export default function BillingSuccessPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16 text-center sm:px-6">
      <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-6 py-10">
        <p className="text-lg font-bold text-red-800">お支払いありがとうございます</p>
        <p className="text-sm text-zinc-600">
          決済を確認しています。通常は数秒でPROが有効になります。反映されない場合は少し時間をおいてアカウントページをご確認ください。
        </p>
      </div>
      <Link
        href="/account"
        className="self-center rounded-full bg-gradient-to-b from-red-500 to-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:from-red-600 hover:to-red-700"
      >
        アカウントを確認する
      </Link>
    </main>
  );
}
