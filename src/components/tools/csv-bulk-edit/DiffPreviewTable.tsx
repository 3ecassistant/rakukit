export interface DiffSample {
  rowLabel: string;
  before: string;
  after: string;
}

export default function DiffPreviewTable({ samples }: { samples: DiffSample[] }) {
  if (samples.length === 0) {
    return <p className="text-sm text-zinc-400">対象となる変更はありません。</p>;
  }

  return (
    <div className="max-h-80 overflow-auto rounded-lg border border-zinc-200">
      <table className="w-full min-w-max border-collapse text-left text-xs">
        <thead className="sticky top-0 bg-zinc-100">
          <tr>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">行</th>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">変更前</th>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">変更後</th>
          </tr>
        </thead>
        <tbody>
          {samples.map((s, i) => (
            <tr key={i} className="odd:bg-white even:bg-zinc-50">
              <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-400">{s.rowLabel}</td>
              <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-500">{s.before || "（空欄）"}</td>
              <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-800">
                {s.after || <span className="text-red-500">（空欄）</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
