interface ColumnMappingProps {
  header: string[];
  productKeyIndex: number | null;
  productNameIndex: number | null;
  rootKeywordIndex: number | null;
  onChange: (patch: { productKeyIndex?: number; productNameIndex?: number; rootKeywordIndex?: number | null }) => void;
}

export default function ColumnMapping({
  header,
  productKeyIndex,
  productNameIndex,
  rootKeywordIndex,
  onChange,
}: ColumnMappingProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <label className="flex flex-col gap-1 text-sm text-zinc-600">
        商品コード列
        <select
          value={productKeyIndex ?? ""}
          onChange={(e) => onChange({ productKeyIndex: Number(e.target.value) })}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
        >
          <option value="">選択してください</option>
          {header.map((h, i) => (
            <option key={i} value={i}>
              {h || `列${i + 1}`}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm text-zinc-600">
        商品名列
        <select
          value={productNameIndex ?? ""}
          onChange={(e) => onChange({ productNameIndex: Number(e.target.value) })}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
        >
          <option value="">選択してください</option>
          {header.map((h, i) => (
            <option key={i} value={i}>
              {h || `列${i + 1}`}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm text-zinc-600">
        起点キーワード列（任意）
        <select
          value={rootKeywordIndex ?? ""}
          onChange={(e) => onChange({ rootKeywordIndex: e.target.value === "" ? null : Number(e.target.value) })}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
        >
          <option value="">CSVに列がない（後で一括設定）</option>
          {header.map((h, i) => (
            <option key={i} value={i}>
              {h || `列${i + 1}`}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
