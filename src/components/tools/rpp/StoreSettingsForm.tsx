import { StoreSettings } from "@/lib/rppAnalysis";

interface StoreSettingsFormProps {
  settings: StoreSettings;
  onChange: (patch: Partial<StoreSettings>) => void;
}

const FIELDS: { key: keyof StoreSettings; label: string; suffix: string }[] = [
  { key: "targetRoas", label: "目標ROAS", suffix: "%" },
  { key: "minCvr", label: "最低CVR", suffix: "%" },
  { key: "cpcWarning", label: "CPC警戒値", suffix: "円" },
  { key: "zeroSalesAdCostWarning", label: "売上0判定用広告費", suffix: "円" },
  { key: "minEvaluationClicks", label: "最低評価クリック数", suffix: "クリック" },
];

export default function StoreSettingsForm({ settings, onChange }: StoreSettingsFormProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {FIELDS.map((field) => (
        <label key={field.key} className="flex flex-col gap-1 text-xs text-zinc-600">
          {field.label}
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={settings[field.key]}
              onChange={(e) => onChange({ [field.key]: Number(e.target.value) })}
              className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
            />
            <span className="text-zinc-400">{field.suffix}</span>
          </div>
        </label>
      ))}
    </div>
  );
}
