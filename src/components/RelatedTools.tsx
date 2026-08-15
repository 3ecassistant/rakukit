"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TOOLS, ToolMeta } from "@/lib/toolsRegistry";

const MAX_RELATED = 6;

function pickRelated(current: ToolMeta): ToolMeta[] {
  const startIndex = TOOLS.findIndex((t) => t.slug === current.slug);
  if (startIndex === -1) return [];

  const related: ToolMeta[] = [];
  for (let i = 1; i < TOOLS.length && related.length < MAX_RELATED; i++) {
    const candidate = TOOLS[(startIndex + i) % TOOLS.length];
    if (candidate.category === current.category && candidate.status === "available") {
      related.push(candidate);
    }
  }
  return related;
}

export default function RelatedTools() {
  const pathname = usePathname();
  const slug = pathname?.split("/")[2];
  const current = TOOLS.find((t) => t.slug === slug);
  if (!current) return null;

  const related = pickRelated(current);
  if (related.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-14 sm:px-6">
      <div className="flex items-center justify-between gap-2 border-t border-zinc-200 pt-8">
        <h2 className="flex items-center gap-2 border-l-4 border-red-600 pl-3 text-sm font-bold text-zinc-800">
          関連ツール
        </h2>
        <Link href="/" className="text-xs font-medium text-zinc-500 hover:text-red-600">
          すべてのツールを見る ＞
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {related.map((tool) => (
          <Link
            key={tool.slug}
            href={`/tools/${tool.slug}`}
            className="flex flex-col gap-1 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-red-400 hover:shadow-md"
          >
            <p className="text-sm font-bold text-zinc-900">{tool.title}</p>
            <p className="line-clamp-2 text-xs text-zinc-500">{tool.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
