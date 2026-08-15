"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const PRO_VALUES = [
  "毎回の入力を省略（商品を選ぶだけで自動入力）",
  "商品・店舗設定の保存",
  "計算履歴の保存",
  "複数シナリオの比較",
  "CSV一括処理",
];

export default function PricingPlans() {
  const router = useRouter();
  const [interval, setInterval] = useState<"MONTH" | "YEAR">("MONTH");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingInterval: interval }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login?next=/pricing");
          return;
        }
        setError(data.error ?? "エラーが発生しました");
        setLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("通信エラーが発生しました。時間をおいて再度お試しください。");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-center">
        <div className="inline-flex rounded-full border border-zinc-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setInterval("MONTH")}
            className={`rounded-full px-5 py-1.5 text-sm font-bold transition-colors ${
              interval === "MONTH" ? "bg-red-600 text-white" : "text-zinc-600"
            }`}
          >
            月払い
          </button>
          <button
            type="button"
            onClick={() => setInterval("YEAR")}
            className={`rounded-full px-5 py-1.5 text-sm font-bold transition-colors ${
              interval === "YEAR" ? "bg-red-600 text-white" : "text-zinc-600"
            }`}
          >
            年払い
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* FREE */}
        <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-bold text-zinc-500">その場で判断したい方</p>
            <p className="mt-2 text-3xl font-black text-zinc-900">¥0</p>
          </div>
          <ul className="flex flex-1 flex-col gap-2 text-sm text-zinc-600">
            <li>・24種類の判断ツールすべて利用可能</li>
            <li>・ログイン不要</li>
            <li>・計算回数の制限なし</li>
            <li>・結果コピー</li>
          </ul>
          <Link
            href="/"
            className="self-start rounded-full border border-zinc-300 px-6 py-2.5 text-sm font-bold text-zinc-700 transition-colors hover:border-red-400 hover:text-red-600"
          >
            今すぐ無料で使う
          </Link>
        </div>

        {/* PRO */}
        <div className="flex flex-col gap-4 rounded-lg border-2 border-red-600 bg-white p-6 shadow-md">
          <div>
            <p className="text-sm font-bold text-red-600">日々の店舗運営に使いたい方</p>
            {interval === "MONTH" ? (
              <>
                <p className="mt-2 text-3xl font-black text-zinc-900">
                  ¥4,980<span className="text-base font-medium text-zinc-500"> / 月</span>
                </p>
                <p className="text-xs text-zinc-400">毎月のお支払い</p>
              </>
            ) : (
              <>
                <p className="mt-2 text-3xl font-black text-zinc-900">
                  ¥49,800<span className="text-base font-medium text-zinc-500"> / 年</span>
                </p>
                <p className="text-xs text-zinc-500">
                  49,800円を年1回請求（月額換算 ¥4,150・月払いより年間¥9,960お得）
                </p>
              </>
            )}
          </div>
          <ul className="flex flex-1 flex-col gap-2 text-sm text-zinc-600">
            {PRO_VALUES.map((value) => (
              <li key={value}>・{value}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={loading}
            className="self-start rounded-full bg-gradient-to-b from-red-500 to-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:from-red-600 hover:to-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "処理中…" : "PROを始める"}
          </button>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <p className="text-xs text-zinc-400">
            お申し込みにより
            <Link href="/legal/terms" className="text-zinc-500 underline hover:text-red-600">
              利用規約
            </Link>
            及び
            <Link href="/legal/privacy" className="text-zinc-500 underline hover:text-red-600">
              プライバシーポリシー
            </Link>
            に同意したものとみなされます。ご契約は自動更新となり、次回更新日の前まで解約可能です。
          </p>
        </div>
      </div>
    </div>
  );
}
