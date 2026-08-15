import { Metadata } from "next";
import PricingPlans from "@/components/billing/PricingPlans";

export const metadata: Metadata = {
  title: "料金プラン",
  description: "計算は無料。保存・連携・一括運用はPRO。",
};

export default function PricingPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-black text-zinc-900 sm:text-3xl">
          計算は無料。保存・連携・一括運用はPRO。
        </h1>
        <p className="text-sm text-zinc-500 sm:text-base">
          楽天店舗の利益・広告・販促判断を、毎回ゼロから計算しない。
        </p>
      </header>

      <PricingPlans />
    </main>
  );
}
