import Link from "next/link";
import { CATEGORY_ORDER, TOOLS } from "@/lib/toolsRegistry";

export default function Home() {
  return (
    <main className="flex w-full flex-col gap-10 pb-12">
      <div className="bg-gradient-to-b from-red-700 to-red-600">
        <header className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-10 text-center sm:px-6 sm:py-14">
          <p className="text-xs font-bold tracking-widest text-gold-400">
            RAKUTEN ICHIBA SELLER TOOLS
          </p>
          <h1 className="text-2xl font-black text-white sm:text-3xl">
            楽天市場出店者向け、業務効率化ツール集
          </h1>
          <p className="text-sm text-red-100 sm:text-base">
            画像・商品テキスト・HTML・CSVの面倒な作業を、ブラウザだけで一括処理。
          </p>
        </header>
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 sm:px-6">
        {CATEGORY_ORDER.map((category) => {
          const tools = TOOLS.filter((tool) => tool.category === category);
          if (tools.length === 0) return null;
          return (
            <section key={category} className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 border-l-4 border-red-600 pl-3 text-sm font-bold text-zinc-800">
                {category}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tools.map((tool) => (
                  <Link
                    key={tool.slug}
                    href={`/tools/${tool.slug}`}
                    className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-red-400 hover:shadow-md"
                  >
                    <p className="font-bold text-zinc-900">{tool.title}</p>
                    <p className="flex-1 text-sm text-zinc-500">{tool.description}</p>
                    <span className="self-start rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
                      使う ＞
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
