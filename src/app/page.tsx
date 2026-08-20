import Link from "next/link";
import { USE_CASE_ORDER, TOOLS } from "@/lib/toolsRegistry";

function useCaseAnchor(useCase: string) {
  return `usecase-${useCase.replace(/[()・]/g, "")}`;
}

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

      <nav className="mx-auto flex w-full max-w-5xl flex-wrap gap-2 px-4 sm:px-6">
        {USE_CASE_ORDER.map((useCase) => {
          const count = TOOLS.filter((tool) =>
            tool.useCases.includes(useCase)
          ).length;
          if (count === 0) return null;
          return (
            <a
              key={useCase}
              href={`#${useCaseAnchor(useCase)}`}
              className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 transition-colors hover:border-red-400 hover:text-red-700"
            >
              {useCase}
              <span className="text-[10px] font-semibold text-zinc-400">
                {count}
              </span>
            </a>
          );
        })}
      </nav>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 sm:px-6">
        {USE_CASE_ORDER.map((useCase) => {
          const tools = TOOLS.filter((tool) => tool.useCases.includes(useCase));
          if (tools.length === 0) return null;
          return (
            <section
              key={useCase}
              id={useCaseAnchor(useCase)}
              className="flex scroll-mt-20 flex-col gap-3"
            >
              <h2 className="flex items-center gap-2 border-l-4 border-red-600 pl-3 text-sm font-bold text-zinc-800">
                {useCase}
                <span className="text-xs font-semibold text-zinc-400">
                  {tools.length}
                </span>
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
                    <div className="flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                        {tool.category}
                      </span>
                      {tool.useCases
                        .filter((uc) => uc !== useCase)
                        .map((uc) => (
                          <span
                            key={uc}
                            className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600"
                          >
                            {uc}
                          </span>
                        ))}
                    </div>
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
