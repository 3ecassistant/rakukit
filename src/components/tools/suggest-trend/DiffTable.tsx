import { DiffEntry, DiffStatus } from "@/lib/suggestDiff";

const STATUS_LABELS: Record<DiffStatus, string> = { new: "NEW", out: "OUT", keep: "KEEP" };
const STATUS_STYLES: Record<DiffStatus, string> = {
  new: "bg-red-100 text-red-700",
  out: "bg-zinc-200 text-zinc-600",
  keep: "bg-green-50 text-green-700",
};

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("ja-JP");
}

export default function DiffTable({ entries }: { entries: DiffEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-zinc-400">該当するキーワードはありません。</p>;
  }

  return (
    <div className="max-h-96 overflow-auto rounded-lg border border-zinc-200">
      <table className="w-full min-w-max border-collapse text-left text-xs">
        <thead className="sticky top-0 bg-zinc-100">
          <tr>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">状態</th>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">キーワード</th>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">階層</th>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">親</th>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">初出日</th>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">最終確認日</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr key={`${entry.keyword}-${i}`} className="odd:bg-white even:bg-zinc-50">
              <td className="border-b border-zinc-100 px-3 py-1.5">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${STATUS_STYLES[entry.status]}`}>
                  {STATUS_LABELS[entry.status]}
                </span>
              </td>
              <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-800">{entry.keyword}</td>
              <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-500">{entry.depth}</td>
              <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-500">{entry.parentKeyword}</td>
              <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-500">{formatDate(entry.firstSeenAt)}</td>
              <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-500">{formatDate(entry.lastSeenAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
