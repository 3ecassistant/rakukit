interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  error?: string;
}

export default function NumberField({ label, value, onChange, prefix, suffix, step, error }: NumberFieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm text-zinc-600">
      {label}
      <div
        className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 ${
          error ? "border-red-400" : "border-zinc-300"
        }`}
      >
        {prefix && <span className="shrink-0 whitespace-nowrap text-zinc-400">{prefix}</span>}
        <input
          type="number"
          value={Number.isFinite(value) ? value : ""}
          step={step ?? 1}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          className="w-full min-w-0 text-sm outline-none"
        />
        {suffix && <span className="shrink-0 whitespace-nowrap text-zinc-400">{suffix}</span>}
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}
