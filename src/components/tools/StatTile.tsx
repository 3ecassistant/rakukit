export default function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-zinc-100 bg-red-50/60 px-3 py-2">
      <p className="text-[11px] font-medium text-zinc-500">{label}</p>
      <p className="text-base font-bold text-red-800">{value}</p>
    </div>
  );
}
