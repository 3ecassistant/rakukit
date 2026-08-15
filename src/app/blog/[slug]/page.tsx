import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import RelatedTools from "@/components/blog/RelatedTools";

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2 border-b border-zinc-200 pb-4">
        <p className="text-xs text-zinc-400">{post.publishedAt}</p>
        <h1 className="text-2xl font-black text-zinc-900">{post.title}</h1>
      </header>

      <div
        className="flex flex-col gap-4 text-sm leading-relaxed text-zinc-700 [&_a]:text-red-600 [&_a]:underline [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-zinc-900 [&_li]:leading-relaxed [&_ol]:flex [&_ol]:list-inside [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-1 [&_p]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-zinc-900 [&_ul]:flex [&_ul]:list-inside [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1"
        dangerouslySetInnerHTML={{ __html: post.html }}
      />

      <RelatedTools slugs={post.relatedTools} />
    </main>
  );
}
