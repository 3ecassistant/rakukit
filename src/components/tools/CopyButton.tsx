"use client";

import { useState } from "react";

interface CopyButtonProps {
  getText: () => string;
  label?: string;
  disabled?: boolean;
}

export default function CopyButton({ getText, label = "コピー", disabled }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    const text = getText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-red-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {copied ? "コピーしました" : label}
    </button>
  );
}
