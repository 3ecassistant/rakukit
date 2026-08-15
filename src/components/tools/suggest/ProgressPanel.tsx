import { SuggestProgress } from "@/lib/suggestTypes";

interface ProgressPanelProps {
  progress: SuggestProgress;
  onStop: () => void;
}

export default function ProgressPanel({ progress, onStop }: ProgressPanelProps) {
  const total = progress.apiCount + progress.queueLength;
  const percent = total > 0 ? Math.round((progress.apiCount / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5">
      <p className="text-sm font-semibold text-zinc-800">サジェスト収集中…</p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-red-600 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-zinc-400">現在</p>
          <p className="truncate font-medium text-zinc-800">{progress.currentKeyword ?? "-"}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-400">API処理</p>
          <p className="font-medium text-zinc-800">
            {progress.apiCount} / {total}（上限{progress.apiLimit}）
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-400">進捗</p>
          <p className="font-medium text-zinc-800">{percent}%</p>
        </div>
        <div>
          <p className="text-xs text-zinc-400">取得済みキーワード</p>
          <p className="font-medium text-zinc-800">{progress.uniqueCount}件</p>
        </div>
        {progress.seedTotal !== null && (
          <div>
            <p className="text-xs text-zinc-400">展開キーワード進捗</p>
            <p className="font-medium text-zinc-800">
              {progress.seedIndex} / {progress.seedTotal}
            </p>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onStop}
        className="self-start rounded-full border border-red-300 px-5 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
      >
        取得を停止
      </button>
    </div>
  );
}
