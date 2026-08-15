import { SuggestSnapshot } from "@/lib/suggestTrendDb";

const STATUS_LABELS: Record<SuggestSnapshot["status"], string> = {
  completed: "完了",
  partial: "一部失敗",
  failed: "失敗",
};

interface SnapshotHistoryListProps {
  snapshots: SuggestSnapshot[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleExclude: (id: string, excluded: boolean) => void;
}

export default function SnapshotHistoryList({
  snapshots,
  selectedId,
  onSelect,
  onToggleExclude,
}: SnapshotHistoryListProps) {
  if (snapshots.length === 0) {
    return <p className="text-sm text-zinc-400">まだ取得履歴がありません。</p>;
  }

  return (
    <div className="overflow-auto rounded-lg border border-zinc-200">
      <table className="w-full min-w-max border-collapse text-left text-xs">
        <thead className="bg-zinc-100">
          <tr>
            <th className="px-3 py-2" />
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">取得日時</th>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">状態</th>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">件数</th>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">API回数</th>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">比較対象</th>
          </tr>
        </thead>
        <tbody>
          {snapshots.map((s) => (
            <tr
              key={s.id}
              className={`cursor-pointer odd:bg-white even:bg-zinc-50 ${
                selectedId === s.id ? "outline outline-1 outline-red-400" : ""
              }`}
              onClick={() => onSelect(s.id)}
            >
              <td className="border-b border-zinc-100 px-3 py-1.5">
                {selectedId === s.id && <span className="text-red-600">●</span>}
              </td>
              <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-800">
                {new Date(s.fetchedAt).toLocaleString("ja-JP")}
              </td>
              <td className="border-b border-zinc-100 px-3 py-1.5">
                <span
                  className={
                    s.status === "completed"
                      ? "text-green-700"
                      : s.status === "partial"
                        ? "text-yellow-700"
                        : "text-red-700"
                  }
                >
                  {STATUS_LABELS[s.status]}
                </span>
              </td>
              <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-600">{s.uniqueCount}件</td>
              <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-600">{s.apiCount}回</td>
              <td className="border-b border-zinc-100 px-3 py-1.5">
                <label
                  className="flex items-center gap-1 text-zinc-500"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={!s.excludedFromComparison}
                    onChange={(e) => onToggleExclude(s.id, !e.target.checked)}
                  />
                  含める
                </label>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
