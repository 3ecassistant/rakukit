interface CsvPreviewTableProps {
  rows: string[][];
  hasHeaderRow?: boolean;
  maxRows?: number;
}

export default function CsvPreviewTable({
  rows,
  hasHeaderRow = true,
  maxRows = 20,
}: CsvPreviewTableProps) {
  if (rows.length === 0) return null;

  const header = hasHeaderRow ? rows[0] : null;
  const bodyRows = (hasHeaderRow ? rows.slice(1) : rows).slice(0, maxRows);

  return (
    <div className="max-h-96 overflow-auto rounded-lg border border-zinc-200">
      <table className="w-full min-w-max border-collapse text-left text-xs">
        {header && (
          <thead className="sticky top-0 bg-zinc-100">
            <tr>
              {header.map((cell, i) => (
                <th key={i} className="whitespace-nowrap border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">
                  {cell || `列${i + 1}`}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {bodyRows.map((row, rowIndex) => (
            <tr key={rowIndex} className="odd:bg-white even:bg-zinc-50">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="whitespace-nowrap border-b border-zinc-100 px-3 py-1.5 text-zinc-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
