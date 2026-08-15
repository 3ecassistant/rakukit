"use client";

import { useState } from "react";

export default function PortalButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/create-portal-session", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
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
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="self-start rounded-full border border-red-600 px-5 py-2 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "処理中…" : "契約・お支払いを管理"}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
