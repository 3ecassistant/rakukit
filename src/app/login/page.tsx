import { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "ログイン",
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">ログイン</h1>
      </header>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <LoginForm />
      </div>
    </main>
  );
}
