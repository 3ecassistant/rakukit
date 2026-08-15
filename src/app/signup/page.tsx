import { Metadata } from "next";
import SignUpForm from "@/components/auth/SignUpForm";

export const metadata: Metadata = {
  title: "アカウント作成",
  description: "RakuKit PROプランのご利用にはアカウント登録が必要です。",
};

export default function SignUpPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">アカウント作成</h1>
        <p className="text-sm text-zinc-500">
          基本ツールはログインなしで使えます。店舗設定や商品の保存などPRO機能を使うにはアカウントが必要です。
        </p>
      </header>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <SignUpForm />
      </div>
    </main>
  );
}
