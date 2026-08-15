import Encoding from "encoding-japanese";
import Papa from "papaparse";

export type CsvEncodingTarget = "UTF8" | "UTF8BOM" | "SJIS" | "EUCJP";

export interface CsvLoadResult {
  fileName: string;
  fileSize: number;
  text: string;
  encodingLabel: string;
  hasBom: boolean;
  lineBreak: "CRLF" | "LF" | "CR" | "不明";
  delimiter: string;
  rows: string[][];
  rowCount: number;
  colCount: number;
  parseErrors: Papa.ParseError[];
  /** ダウンロード時に「元の文字コードを維持」する際に使う変換先ターゲット。 */
  detectedTarget: CsvEncodingTarget;
}

const ENCODING_LABELS: Partial<Record<Encoding.Encoding, string>> = {
  UTF8: "UTF-8",
  SJIS: "Shift_JIS",
  EUCJP: "EUC-JP",
  UNICODE: "UTF-16",
  ASCII: "ASCII",
  JIS: "JIS",
};

function detectLineBreak(text: string): CsvLoadResult["lineBreak"] {
  if (text.includes("\r\n")) return "CRLF";
  if (text.includes("\n")) return "LF";
  if (text.includes("\r")) return "CR";
  return "不明";
}

export async function loadCsvFile(file: File): Promise<CsvLoadResult> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const hasBom = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const detected = Encoding.detect(bytes);
  const encodingKey: Encoding.Encoding = detected === false ? "UTF8" : detected;

  const unicodeCodes = Encoding.convert(bytes, { to: "UNICODE", from: encodingKey, type: "array" });
  let text = Encoding.codeToString(unicodeCodes);
  if (hasBom && text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  const baseLabel = ENCODING_LABELS[encodingKey] ?? encodingKey;
  const encodingLabel = hasBom ? `${baseLabel} (BOM付き)` : baseLabel;

  const lineBreak = detectLineBreak(text);
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false });
  const rows = (parsed.data as string[][]).filter(
    (row) => !(row.length === 1 && row[0] === "")
  );

  let detectedTarget: CsvEncodingTarget;
  if (encodingKey === "SJIS") detectedTarget = "SJIS";
  else if (encodingKey === "EUCJP") detectedTarget = "EUCJP";
  else detectedTarget = hasBom ? "UTF8BOM" : "UTF8";

  return {
    fileName: file.name,
    fileSize: file.size,
    text,
    encodingLabel,
    hasBom,
    lineBreak,
    delimiter: parsed.meta.delimiter || ",",
    rows,
    rowCount: rows.length,
    colCount: rows[0]?.length ?? 0,
    parseErrors: parsed.errors,
    detectedTarget,
  };
}

export function describeParseError(error: Papa.ParseError): string {
  const row = typeof error.row === "number" ? error.row + 1 : undefined;
  return row ? `${row}行目: ${error.message}` : error.message;
}

export function encodeText(text: string, target: CsvEncodingTarget): Uint8Array<ArrayBuffer> {
  if (target === "UTF8" || target === "UTF8BOM") {
    const utf8 = new TextEncoder().encode(text);
    if (target === "UTF8BOM") {
      const withBom = new Uint8Array(utf8.length + 3);
      withBom.set([0xef, 0xbb, 0xbf], 0);
      withBom.set(utf8, 3);
      return withBom;
    }
    return utf8;
  }

  const unicodeCodes = Encoding.stringToCode(text);
  const converted = Encoding.convert(unicodeCodes, { to: target, from: "UNICODE", type: "array" });
  return new Uint8Array(converted);
}

export function rowsToCsv(rows: string[][], lineBreak: "CRLF" | "LF" = "CRLF"): string {
  return Papa.unparse(rows, { newline: lineBreak === "CRLF" ? "\r\n" : "\n" });
}

export function buildCsvBlob(
  rows: string[][],
  encodingTarget: CsvEncodingTarget = "UTF8BOM",
  lineBreak: "CRLF" | "LF" = "CRLF"
): Blob {
  const csvText = rowsToCsv(rows, lineBreak);
  const bytes = encodeText(csvText, encodingTarget);
  return new Blob([bytes], { type: "text/csv" });
}
