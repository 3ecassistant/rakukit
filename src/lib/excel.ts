import ExcelJS from "exceljs";

const FORMULA_TRIGGER_CHARS = ["=", "+", "-", "@", "\t", "\r"];

function sanitizeCell(value: string): string {
  if (value.length > 0 && FORMULA_TRIGGER_CHARS.includes(value[0])) {
    return `'${value}`;
  }
  return value;
}

export interface BuildExcelOptions {
  hasHeaderRow?: boolean;
  sheetName?: string;
}

export async function buildExcelFromRows(
  rows: string[][],
  options: BuildExcelOptions = {}
): Promise<Blob> {
  const { hasHeaderRow = true, sheetName = "Sheet1" } = options;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName, {
    views: hasHeaderRow ? [{ state: "frozen", ySplit: 1 }] : [],
  });

  const colCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const columnWidths = new Array(colCount).fill(8);

  rows.forEach((row, rowIndex) => {
    const sanitizedRow = row.map((cell) => sanitizeCell(cell ?? ""));
    const excelRow = sheet.addRow(sanitizedRow);
    excelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.numFmt = "@";
      const length = String(cell.value ?? "").length;
      columnWidths[colNumber - 1] = Math.min(50, Math.max(columnWidths[colNumber - 1], length + 2));
    });
    if (hasHeaderRow && rowIndex === 0) {
      excelRow.font = { bold: true };
    }
  });

  sheet.columns.forEach((col, i) => {
    col.width = columnWidths[i] ?? 12;
  });

  if (hasHeaderRow && rows.length > 0 && colCount > 0) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: colCount },
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
