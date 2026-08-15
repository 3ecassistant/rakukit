import { ReactNode } from "react";

interface LegalDocumentProps {
  title: string;
  updatedAt: string;
  children: ReactNode;
}

export default function LegalDocument({ title, updatedAt, children }: LegalDocumentProps) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-1 border-b border-zinc-200 pb-4">
        <h1 className="text-2xl font-black text-zinc-900">{title}</h1>
        <p className="text-xs text-zinc-400">最終改定日: {updatedAt}</p>
      </header>
      <div className="flex flex-col gap-6 text-sm leading-relaxed text-zinc-700">{children}</div>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-bold text-zinc-900">{title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}
