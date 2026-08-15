import Link from "next/link";
import { Metadata } from "next";
import { getAllPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "ブログ",
  description: "楽天市場運営のノウハウを、SEO・広告・利益計算・競合分析などのテーマ別に解説します。",
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">ブログ</h1>
        <p className="text-sm text-zinc-500">
          楽天市場運営のノウハウを、SEO・広告・利益計算・競合分析などのテーマ別に解説します。
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-red-400 hover:shadow-md"
          >
            <p className="text-xs text-zinc-400">{post.publishedAt}</p>
            <p className="text-lg font-bold text-zinc-900">{post.title}</p>
            <p className="text-sm text-zinc-500">{post.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
