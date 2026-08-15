export type OperationType = "replace" | "append" | "remove";
export type MatchMode = "partial" | "exact" | "prefix" | "suffix";
export type ConditionType = "none" | "text" | "number" | "code-list";
export type TextConditionOp =
  | "contains"
  | "not-contains"
  | "equals"
  | "not-equals"
  | "prefix"
  | "suffix"
  | "empty"
  | "not-empty";
export type NumberConditionOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "range";

export interface Condition {
  type: ConditionType;
  columnIndex: number | null;
  textOp?: TextConditionOp;
  textValue?: string;
  numberOp?: NumberConditionOp;
  numberValue?: number;
  numberValue2?: number;
  codeList?: string[];
}

export interface OperationSettings {
  type: OperationType;
  targetColumnIndex: number;
  search?: string;
  replace?: string;
  matchMode?: MatchMode;
  caseSensitive?: boolean;
  appendText?: string;
  appendPosition?: "prefix" | "suffix";
  skipIfExists?: boolean;
  removeText?: string;
  trimAfter?: boolean;
}

export const DEFAULT_CONDITION: Condition = { type: "none", columnIndex: null };

export function rowMatchesCondition(row: string[], condition: Condition): boolean {
  if (condition.type === "none" || condition.columnIndex === null) return true;
  const cell = row[condition.columnIndex] ?? "";

  if (condition.type === "text") {
    const value = condition.textValue ?? "";
    switch (condition.textOp) {
      case "contains":
        return cell.includes(value);
      case "not-contains":
        return !cell.includes(value);
      case "equals":
        return cell === value;
      case "not-equals":
        return cell !== value;
      case "prefix":
        return cell.startsWith(value);
      case "suffix":
        return cell.endsWith(value);
      case "empty":
        return cell.trim() === "";
      case "not-empty":
        return cell.trim() !== "";
      default:
        return true;
    }
  }

  if (condition.type === "number") {
    const num = Number.parseFloat(cell.replace(/,/g, ""));
    if (Number.isNaN(num)) return false;
    const v = condition.numberValue ?? 0;
    switch (condition.numberOp) {
      case "eq":
        return num === v;
      case "neq":
        return num !== v;
      case "gt":
        return num > v;
      case "gte":
        return num >= v;
      case "lt":
        return num < v;
      case "lte":
        return num <= v;
      case "range":
        return num >= v && num <= (condition.numberValue2 ?? v);
      default:
        return true;
    }
  }

  if (condition.type === "code-list") {
    const list = condition.codeList ?? [];
    return list.includes(cell.trim());
  }

  return true;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyReplaceToCell(cell: string, settings: OperationSettings): string {
  const { search = "", replace = "", matchMode = "partial", caseSensitive = true } = settings;
  if (!search) return cell;

  if (matchMode === "exact") return cell === search ? replace : cell;

  const flags = caseSensitive ? "g" : "gi";
  const escaped = escapeRegExp(search);
  if (matchMode === "partial") return cell.replace(new RegExp(escaped, flags), replace);
  if (matchMode === "prefix") return cell.replace(new RegExp(`^${escaped}`, flags), replace);
  return cell.replace(new RegExp(`${escaped}$`, flags), replace);
}

function applyAppendToCell(cell: string, settings: OperationSettings): string {
  const { appendText = "", appendPosition = "suffix", skipIfExists = true } = settings;
  if (!appendText) return cell;
  if (skipIfExists && cell.includes(appendText)) return cell;
  if (!cell) return appendText;
  return appendPosition === "prefix" ? `${appendText} ${cell}` : `${cell} ${appendText}`;
}

function applyRemoveToCell(cell: string, settings: OperationSettings): string {
  const { removeText = "" } = settings;
  if (!removeText) return cell;
  return cell.split(removeText).join("");
}

export function cleanupSpaces(cell: string): string {
  return cell
    .replace(/^[ 　]+/, "")
    .replace(/[ 　]+$/, "")
    .replace(/ {2,}/g, " ")
    .replace(/　{2,}/g, "　");
}

export function applyOperationToCell(cell: string, settings: OperationSettings): string {
  let result = cell;
  if (settings.type === "replace") result = applyReplaceToCell(cell, settings);
  else if (settings.type === "append") result = applyAppendToCell(cell, settings);
  else if (settings.type === "remove") result = applyRemoveToCell(cell, settings);
  if (settings.trimAfter) result = cleanupSpaces(result);
  return result;
}

export interface OperationResult {
  newRows: string[][];
  changedRowIndices: number[];
  becameEmptyCount: number;
}

/** dataRows はヘッダーを含まない行データ。 */
export function computeOperation(
  dataRows: string[][],
  settings: OperationSettings,
  condition: Condition
): OperationResult {
  const newRows: string[][] = [];
  const changedRowIndices: number[] = [];
  let becameEmptyCount = 0;

  dataRows.forEach((row, i) => {
    if (!rowMatchesCondition(row, condition)) {
      newRows.push(row);
      return;
    }
    const original = row[settings.targetColumnIndex] ?? "";
    const updated = applyOperationToCell(original, settings);
    if (updated !== original) {
      changedRowIndices.push(i);
      if (updated.trim() === "" && original.trim() !== "") becameEmptyCount++;
      const newRow = [...row];
      newRow[settings.targetColumnIndex] = updated;
      newRows.push(newRow);
    } else {
      newRows.push(row);
    }
  });

  return { newRows, changedRowIndices, becameEmptyCount };
}
