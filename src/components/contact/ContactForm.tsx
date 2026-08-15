"use client";

import { FormEvent, useState } from "react";

type Status = "idle" | "sending" | "sent" | "error";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error ?? "送信に失敗しました");
        return;
      }

      setStatus("sent");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setStatus("error");
      setErrorMessage("送信に失敗しました。通信環境をご確認のうえ、再度お試しください。");
    }
  };

  if (status === "sent") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-6 py-10 text-center">
        <p className="text-lg font-bold text-red-800">送信しました</p>
        <p className="text-sm text-zinc-600">
          お問い合わせいただきありがとうございます。内容を確認のうえ、ご返信いたします。
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-name" className="text-sm font-semibold text-zinc-800">
          お名前
        </label>
        <input
          id="contact-name"
          type="text"
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={status === "sending"}
          className="w-full rounded-lg border border-zinc-300 p-3 text-sm focus:border-red-400 focus:outline-none disabled:opacity-60"
          placeholder="楽天 太郎"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-email" className="text-sm font-semibold text-zinc-800">
          メールアドレス
        </label>
        <input
          id="contact-email"
          type="email"
          required
          maxLength={200}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "sending"}
          className="w-full rounded-lg border border-zinc-300 p-3 text-sm focus:border-red-400 focus:outline-none disabled:opacity-60"
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-message" className="text-sm font-semibold text-zinc-800">
          お問い合わせ内容
        </label>
        <textarea
          id="contact-message"
          required
          maxLength={5000}
          rows={7}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={status === "sending"}
          className="w-full resize-y rounded-lg border border-zinc-300 p-3 text-sm focus:border-red-400 focus:outline-none disabled:opacity-60"
          placeholder="ご質問・不具合報告・ご要望などをご記入ください"
        />
      </div>

      {status === "error" && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="self-start rounded-full bg-gradient-to-b from-red-500 to-red-600 px-8 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:from-red-600 hover:to-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "sending" ? "送信中…" : "送信する"}
      </button>
    </form>
  );
}
