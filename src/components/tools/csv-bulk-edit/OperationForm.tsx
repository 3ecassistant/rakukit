"use client";

import {
  Condition,
  ConditionType,
  MatchMode,
  NumberConditionOp,
  OperationSettings,
  OperationType,
  TextConditionOp,
} from "@/lib/csvBulkEdit";
import { recognizeColumn } from "@/lib/rakutenColumnMaster";

const OPERATION_LABELS: Record<OperationType, string> = {
  replace: "一括置換",
  append: "文字列追加",
  remove: "文字列削除",
};

const MATCH_MODE_LABELS: Record<MatchMode, string> = {
  partial: "部分一致",
  exact: "完全一致",
  prefix: "前方一致",
  suffix: "後方一致",
};

const TEXT_OP_LABELS: Record<TextConditionOp, string> = {
  contains: "含む",
  "not-contains": "含まない",
  equals: "完全一致",
  "not-equals": "一致しない",
  prefix: "前方一致",
  suffix: "後方一致",
  empty: "空欄",
  "not-empty": "空欄ではない",
};

const NUMBER_OP_LABELS: Record<NumberConditionOp, string> = {
  eq: "=",
  neq: "≠",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  range: "範囲指定",
};

function ColumnSelect({
  header,
  value,
  onChange,
  placeholder,
}: {
  header: string[];
  value: number | null;
  onChange: (index: number) => void;
  placeholder?: string;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(Number(e.target.value))}
      className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {header.map((name, i) => {
        const recognized = recognizeColumn(name);
        return (
          <option key={i} value={i}>
            {name || `列${i + 1}`}
            {recognized ? `（${recognized.label}）` : ""}
          </option>
        );
      })}
    </select>
  );
}

interface OperationFormProps {
  header: string[];
  settings: OperationSettings;
  onSettingsChange: (patch: Partial<OperationSettings>) => void;
  condition: Condition;
  onConditionChange: (patch: Partial<Condition>) => void;
}

export default function OperationForm({
  header,
  settings,
  onSettingsChange,
  condition,
  onConditionChange,
}: OperationFormProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(OPERATION_LABELS) as OperationType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onSettingsChange({ type })}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
              settings.type === type
                ? "border-red-600 bg-red-600 text-white"
                : "border-zinc-300 text-zinc-700 hover:border-red-400"
            }`}
          >
            {OPERATION_LABELS[type]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-zinc-600">対象列</span>
        <ColumnSelect
          header={header}
          value={settings.targetColumnIndex}
          onChange={(i) => onSettingsChange({ targetColumnIndex: i })}
        />
      </div>

      {settings.type === "replace" && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={settings.search ?? ""}
              onChange={(e) => onSettingsChange({ search: e.target.value })}
              placeholder="検索文字列"
              className="w-44 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
            />
            <span className="text-zinc-400">→</span>
            <input
              type="text"
              value={settings.replace ?? ""}
              onChange={(e) => onSettingsChange({ replace: e.target.value })}
              placeholder="置換後の文字列"
              className="w-44 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(MATCH_MODE_LABELS) as MatchMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onSettingsChange({ matchMode: mode })}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  (settings.matchMode ?? "partial") === mode
                    ? "border-red-600 bg-red-600 text-white"
                    : "border-zinc-300 text-zinc-600 hover:border-red-400"
                }`}
              >
                {MATCH_MODE_LABELS[mode]}
              </button>
            ))}
            <label className="flex items-center gap-1.5 text-xs text-zinc-600">
              <input
                type="checkbox"
                checked={settings.caseSensitive ?? true}
                onChange={(e) => onSettingsChange({ caseSensitive: e.target.checked })}
              />
              大文字小文字を区別
            </label>
          </div>
        </div>
      )}

      {settings.type === "append" && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={settings.appendText ?? ""}
              onChange={(e) => onSettingsChange({ appendText: e.target.value })}
              placeholder="追加する文字列"
              className="w-56 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
            />
            <div className="flex gap-1">
              {(["prefix", "suffix"] as const).map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => onSettingsChange({ appendPosition: pos })}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    (settings.appendPosition ?? "suffix") === pos
                      ? "border-red-600 bg-red-600 text-white"
                      : "border-zinc-300 text-zinc-600 hover:border-red-400"
                  }`}
                >
                  {pos === "prefix" ? "先頭に追加" : "末尾に追加"}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-zinc-600">
            <input
              type="checkbox"
              checked={settings.skipIfExists ?? true}
              onChange={(e) => onSettingsChange({ skipIfExists: e.target.checked })}
            />
            既に含まれている場合は追加しない
          </label>
        </div>
      )}

      {settings.type === "remove" && (
        <input
          type="text"
          value={settings.removeText ?? ""}
          onChange={(e) => onSettingsChange({ removeText: e.target.value })}
          placeholder="削除する文字列"
          className="w-56 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
        />
      )}

      <label className="flex items-center gap-1.5 text-xs text-zinc-600">
        <input
          type="checkbox"
          checked={settings.trimAfter ?? false}
          onChange={(e) => onSettingsChange({ trimAfter: e.target.checked })}
        />
        処理後に前後の空白・連続スペースを整理する
      </label>

      <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3">
        <p className="text-xs font-semibold text-zinc-600">対象行の条件（任意）</p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["none", "すべての行"],
              ["text", "文字列条件"],
              ["number", "数値条件"],
              ["code-list", "商品コード指定"],
            ] as [ConditionType, string][]
          ).map(([type, label]) => (
            <button
              key={type}
              type="button"
              onClick={() => onConditionChange({ type, columnIndex: type === "none" ? null : condition.columnIndex })}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                condition.type === type
                  ? "border-red-600 bg-red-600 text-white"
                  : "border-zinc-300 text-zinc-600 hover:border-red-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {condition.type !== "none" && condition.type !== "code-list" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">条件列</span>
            <ColumnSelect
              header={header}
              value={condition.columnIndex}
              onChange={(i) => onConditionChange({ columnIndex: i })}
              placeholder="列を選択"
            />
          </div>
        )}

        {condition.type === "text" && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={condition.textOp ?? "contains"}
              onChange={(e) => onConditionChange({ textOp: e.target.value as TextConditionOp })}
              className="rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
            >
              {(Object.keys(TEXT_OP_LABELS) as TextConditionOp[]).map((op) => (
                <option key={op} value={op}>
                  {TEXT_OP_LABELS[op]}
                </option>
              ))}
            </select>
            {condition.textOp !== "empty" && condition.textOp !== "not-empty" && (
              <input
                type="text"
                value={condition.textValue ?? ""}
                onChange={(e) => onConditionChange({ textValue: e.target.value })}
                placeholder="値"
                className="w-40 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
              />
            )}
          </div>
        )}

        {condition.type === "number" && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={condition.numberOp ?? "gte"}
              onChange={(e) => onConditionChange({ numberOp: e.target.value as NumberConditionOp })}
              className="rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
            >
              {(Object.keys(NUMBER_OP_LABELS) as NumberConditionOp[]).map((op) => (
                <option key={op} value={op}>
                  {NUMBER_OP_LABELS[op]}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={condition.numberValue ?? ""}
              onChange={(e) => onConditionChange({ numberValue: Number(e.target.value) })}
              placeholder="値"
              className="w-28 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
            />
            {condition.numberOp === "range" && (
              <>
                <span className="text-zinc-400">〜</span>
                <input
                  type="number"
                  value={condition.numberValue2 ?? ""}
                  onChange={(e) => onConditionChange({ numberValue2: Number(e.target.value) })}
                  placeholder="上限値"
                  className="w-28 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
                />
              </>
            )}
          </div>
        )}

        {condition.type === "code-list" && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">対象列（商品管理番号など）</span>
              <ColumnSelect
                header={header}
                value={condition.columnIndex}
                onChange={(i) => onConditionChange({ columnIndex: i })}
                placeholder="列を選択"
              />
            </div>
            <textarea
              value={(condition.codeList ?? []).join("\n")}
              onChange={(e) =>
                onConditionChange({
                  codeList: e.target.value
                    .split("\n")
                    .map((v) => v.trim())
                    .filter(Boolean),
                })
              }
              rows={4}
              placeholder={"abc001\nabc002\nabc003"}
              className="w-full resize-y rounded-lg border border-zinc-300 p-2 font-mono text-xs"
            />
          </div>
        )}
      </div>
    </div>
  );
}
