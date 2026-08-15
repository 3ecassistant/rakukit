import { ReactNode } from "react";

interface ToolSectionProps {
  step: string;
  title: string;
  children: ReactNode;
}

export default function ToolSection({ step, title, children }: ToolSectionProps) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
          {step}
        </span>
        <h2 className="text-sm font-bold text-zinc-800">{title}</h2>
      </div>
      {children}
    </section>
  );
}
