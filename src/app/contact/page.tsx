import { Metadata } from "next";
import ContactForm from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description: "RakuKitに関するご質問・不具合報告・ご要望はこちらからお問い合わせください。",
};

export default function ContactPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">お問い合わせ</h1>
        <p className="text-sm text-zinc-500">
          ご質問・不具合報告・ご要望などがございましたら、下記フォームよりご連絡ください。
        </p>
      </header>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <ContactForm />
      </div>
    </main>
  );
}
