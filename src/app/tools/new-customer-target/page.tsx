"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import NumberField from "@/components/tools/profit/NumberField";
import {
  DEFAULT_NEW_CUSTOMER_TARGET_INPUTS,
  NewCustomerTargetInputs,
  computeNewCustomerTarget,
  validateInputs,
} from "@/lib/newCustomerTargetCalculator";

function fmtYen(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `¥${Math.round(v).toLocaleString()}`;
}
function fmtPct(v: number | null, digits = 1): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${v.toFixed(digits)}%`;
}
function fmtPeople(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${Math.round(v).toLocaleString()}人`;
}

export default function NewCustomerTargetPage() {
  const [inputs, setInputs] = useState<NewCustomerTargetInputs>(DEFAULT_NEW_CUSTOMER_TARGET_INPUTS);
  const [hasCurrent, setHasCurrent] = useState(true);

  const update = (patch: Partial<NewCustomerTargetInputs>) => setInputs((prev) => ({ ...prev, ...patch }));

  const issues = useMemo(() => validateInputs(inputs), [inputs]);
  const issueMap = useMemo(() => {
    const map = new Map<string, string>();
    issues.forEach((i) => map.set(i.field, i.message));
    return map;
  }, [issues]);
  const hasBlockingIssue = issues.length > 0;

  const result = useMemo(() => computeNewCustomerTarget(inputs), [inputs]);

  const handleReset = () => {
    setInputs(DEFAULT_NEW_CUSTOMER_TARGET_INPUTS);
    setHasCurrent(true);
  };

  const summaryText = () =>
    [
      `売上目標: ${fmtYen(inputs.targetSales)} / 新規以外の売上: ${fmtYen(inputs.nonNewCustomerSales)} / 新規顧客AOV: ${fmtYen(inputs.newCustomerAov)}`,
      `必要新規売上: ${fmtYen(result.requiredNewCustomerSales)} / 必要新規顧客数: ${fmtPeople(result.requiredNewCustomers)}`,
      `新規売上構成比: ${fmtPct(result.requiredNewSalesRate)}（新規以外 ${fmtPct(result.nonNewSalesRate)}）`,
      result.newCustomerGap !== null ? `現在${inputs.currentNewCustomers}人 → あと${fmtPeople(result.newCustomerGap)}` : "",
    ]
      .filter(Boolean)
      .join("\n");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">売上目標達成・必要新規顧客数シミュレーター</h1>
        <p className="text-sm text-zinc-500">
          売上目標・新規顧客以外で確保する売上・新規顧客の平均注文単価を入力するだけで、「売上目標を成立させるには新規顧客が最低何人必要か」を逆算します。本ツールは新規顧客数を予測するものではありません。入力した売上条件を成立させるために必要な人数を算術的に逆算します。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <ToolSection step="1" title="売上構成">
            <NumberField
              label="売上目標"
              value={inputs.targetSales}
              onChange={(v) => update({ targetSales: v })}
              prefix="¥"
              error={issueMap.get("targetSales")}
            />
            <NumberField
              label="新規顧客以外で確保する売上（既存・リピーター等）"
              value={inputs.nonNewCustomerSales}
              onChange={(v) => update({ nonNewCustomerSales: v })}
              prefix="¥"
              error={issueMap.get("nonNewCustomerSales")}
            />
            <NumberField
              label="新規顧客の平均注文単価"
              value={inputs.newCustomerAov}
              onChange={(v) => update({ newCustomerAov: v })}
              prefix="¥"
              error={issueMap.get("newCustomerAov")}
            />
          </ToolSection>

          <ToolSection step="2" title="現在新規顧客数（任意）">
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              <input
                type="checkbox"
                checked={hasCurrent}
                onChange={(e) => {
                  setHasCurrent(e.target.checked);
                  update({ currentNewCustomers: e.target.checked ? DEFAULT_NEW_CUSTOMER_TARGET_INPUTS.currentNewCustomers : null });
                }}
              />
              現在新規顧客数を入力する
            </label>
            {hasCurrent && (
              <NumberField
                label="現在新規顧客数"
                value={inputs.currentNewCustomers ?? 0}
                onChange={(v) => update({ currentNewCustomers: v })}
                suffix="人"
                error={issueMap.get("currentNewCustomers")}
              />
            )}
          </ToolSection>

          <button
            type="button"
            onClick={handleReset}
            className="self-start rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-600 hover:border-red-400"
          >
            入力をリセット
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {hasBlockingIssue ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-5">
              <p className="text-sm font-semibold text-red-700">入力内容をご確認ください</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-red-600">
                {issues.map((issue, i) => (
                  <li key={i}>{issue.message}</li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-zinc-200 bg-white p-5 text-center">
                {!result.isNewCustomerRequired ? (
                  <>
                    <p className="text-lg font-semibold text-green-700">
                      {result.nonNewSalesSurplus > 0
                        ? `新規顧客以外の設定売上が目標を${fmtYen(result.nonNewSalesSurplus)}上回っています。`
                        : "設定した新規顧客以外の売上だけで、売上目標と同額になります。"}
                    </p>
                    <p className="mt-1 text-3xl font-bold text-zinc-900">必要新規顧客 0人</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-zinc-400">売上目標 {fmtYen(inputs.targetSales)} を成立させるには</p>
                    <p className="text-4xl font-bold text-zinc-900">新規顧客{fmtPeople(result.requiredNewCustomers)}必要</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      新規売上{fmtYen(result.requiredNewCustomerSales)}を、新規AOV{fmtYen(inputs.newCustomerAov)}で割った必要人数
                    </p>
                  </>
                )}
                {inputs.currentNewCustomers !== null && (
                  <>
                    {result.newCustomerGap !== null && result.newCustomerGap > 0 ? (
                      <p className="mt-3 text-lg font-semibold text-red-600">
                        現在{inputs.currentNewCustomers}人 → あと{fmtPeople(result.newCustomerGap)}
                      </p>
                    ) : result.surplusCustomers !== null ? (
                      <p className="mt-3 text-sm text-zinc-600">
                        入力した現在新規顧客数は、必要人数を{fmtPeople(result.surplusCustomers)}上回っています。
                      </p>
                    ) : (
                      <p className="mt-3 text-sm text-zinc-600">現在人数はちょうど必要人数と同じです。</p>
                    )}
                  </>
                )}
              </div>

              <ToolSection step="3" title="売上構成の内訳">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="必要新規売上" value={fmtYen(result.requiredNewCustomerSales)} />
                  <StatTile label="新規売上構成比" value={fmtPct(result.requiredNewSalesRate)} />
                  <StatTile label="新規以外の構成比" value={fmtPct(result.nonNewSalesRate)} />
                  <StatTile label="必要人数での売上超過分" value={fmtYen(result.salesAboveRequired)} />
                </div>
                <p className="text-xs text-zinc-500">
                  必要新規顧客数は切り上げて算出しているため、実際の売上は必要新規売上をわずかに上回ります。
                </p>
              </ToolSection>

              <p className="text-xs text-zinc-400">
                新規顧客の初回購入を1顧客1注文として計算しています。実際の新規顧客数・新規客単価・売上を予測するものではありません。売上目標・新規顧客以外の売上・現在新規顧客数は、同じ対象期間の数値を入力してください。
              </p>

              <CopyButton getText={summaryText} label="結果をコピー" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
