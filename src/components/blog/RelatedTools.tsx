import Link from "next/link";
import { TOOLS } from "@/lib/toolsRegistry";

export default function RelatedTools({ slugs }: { slugs: string[] }) {
  const tools = slugs
    .map((slug) => TOOLS.find((tool) => tool.slug === slug))
    .filter((tool): tool is NonNullable<typeof tool> => Boolean(tool));

  if (tools.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50/60 p-5">
      <h2 className="text-sm font-bold text-red-800">この記事に関連するツール</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {tools.map((tool) => (
          <Link
            key={tool.slug}
            href={`/tools/${tool.slug}`}
            className="flex flex-col gap-1 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-red-400 hover:shadow-sm"
          >
            <p className="text-sm font-bold text-zinc-900">{tool.title}</p>
            <p className="text-xs text-zinc-500">{tool.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
