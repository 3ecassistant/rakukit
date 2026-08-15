import Link from "next/link";

const LINKS = [
  { href: "/pricing", label: "料金プラン" },
  { href: "/blog", label: "ブログ" },
  { href: "/contact", label: "お問い合わせ" },
  { href: "/legal/terms", label: "利用規約" },
  { href: "/legal/privacy", label: "プライバシーポリシー" },
  { href: "/legal/tokushoho", label: "特定商取引法に基づく表示" },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8 sm:px-6">
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-500">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-red-600">
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs text-zinc-400">&copy; {new Date().getFullYear()} RakuKit</p>
      </div>
    </footer>
  );
}
