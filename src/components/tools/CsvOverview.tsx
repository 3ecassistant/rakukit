import { CsvLoadResult } from "@/lib/csv";
import { formatBytes } from "@/lib/format";

export default function CsvOverview({ csv }: { csv: CsvLoadResult }) {
  const items: [string, string][] = [
    ["ファイル名", csv.fileName],
    ["ファイル容量", formatBytes(csv.fileSize)],
    ["行数", `${csv.rowCount}行`],
    ["列数", `${csv.colCount}列`],
    ["文字コード", csv.encodingLabel],
    ["改行コード", csv.lineBreak],
    ["区切り文字", csv.delimiter === "\t" ? "タブ" : csv.delimiter],
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-0.5 rounded-lg bg-zinc-50 px-3 py-2">
          <p className="text-[11px] text-zinc-400">{label}</p>
          <p className="truncate text-sm font-medium text-zinc-800" title={value}>
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}
