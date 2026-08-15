import { RPP_COLUMN_MASTER, RppFieldKey } from "@/lib/rppColumnMaster";

interface ColumnMappingFormProps {
  header: string[];
  mapping: Partial<Record<RppFieldKey, number>>;
  onChange: (key: RppFieldKey, columnIndex: number) => void;
}

export default function ColumnMappingForm({ header, mapping, onChange }: ColumnMappingFormProps) {
  const missing = RPP_COLUMN_MASTER.filter((e) => mapping[e.key] === undefined);

  return (
    <div className="flex flex-col gap-3">
      {missing.length > 0 && (
        <p className="rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          自動認識できなかった項目があります。CSVのどの列に対応するか選択してください。
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {RPP_COLUMN_MASTER.map((entry) => (
          <label key={entry.key} className="flex flex-col gap-1 text-sm text-zinc-600">
            {entry.label}
            <select
              value={mapping[entry.key] ?? ""}
              onChange={(e) => onChange(entry.key, Number(e.target.value))}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                mapping[entry.key] === undefined ? "border-yellow-400" : "border-zinc-300"
              }`}
            >
              <option value="">列を選択してください</option>
              {header.map((h, i) => (
                <option key={i} value={i}>
                  {h || `列${i + 1}`}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}
