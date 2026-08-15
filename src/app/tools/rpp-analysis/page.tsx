"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CsvUploadPanel from "@/components/tools/CsvUploadPanel";
import CsvOverview from "@/components/tools/CsvOverview";
import CopyButton from "@/components/tools/CopyButton";
import ColumnMappingForm from "@/components/tools/rpp/ColumnMappingForm";
import StoreSettingsForm from "@/components/tools/rpp/StoreSettingsForm";
import ProductTable, { EvaluatedProduct } from "@/components/tools/rpp/ProductTable";
import { CsvLoadResult, buildCsvBlob } from "@/lib/csv";
import { autoRecognizeColumns, RPP_COLUMN_MASTER, RppFieldKey } from "@/lib/rppColumnMaster";
import {
  DEFAULT_STORE_SETTINGS,
  ProductStatus,
  STATUS_LABELS,
  STATUS_SORT_RANK,
  StoreSettings,
  aggregateByProduct,
  computeKpi,
  evaluateProduct,
} from "@/lib/rppAnalysis";
import { baseNameOf } from "@/lib/naming";
import { triggerBlobDownload } from "@/lib/download";

const SETTINGS_STORAGE_KEY = "rakukit-rpp-store-settings";
const ACTION_STATUSES: ProductStatus[] = ["stop-candidate", "page-improvement", "cpc-review"];
const GOOD_STATUSES: ProductStatus[] = ["expand-candidate", "good"];

type Tab = "overview" | "action-needed" | "all" | "good";
type SortMode = "adCost-desc" | "roas-asc" | "roas-desc" | "cvr-asc" | "cpc-desc" | "status";

function loadStoredSettings(): StoreSettings {
  if (typeof window === "undefined") return DEFAULT_STORE_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_STORE_SETTINGS;
    return { ...DEFAULT_STORE_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STORE_SETTINGS;
  }
}

export default function RppAnalysisPage() {
  const [csv, setCsv] = useState<CsvLoadResult | null>(null);
  const [mapping, setMapping] = useState<Partial<Record<RppFieldKey, number>>>({});
  const [settings, setSettings] = useState<StoreSettings>(() => loadStoredSettings());
  const [analyzed, setAnalyzed] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("adCost-desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const handleSettingsChange = (patch: Partial<StoreSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  const handleLoaded = (result: CsvLoadResult) => {
    setCsv(result);
    setMapping(autoRecognizeColumns(result.rows[0] ?? []));
    setAnalyzed(false);
    setSelected(new Set());
  };

  const isMappingComplete = RPP_COLUMN_MASTER.every((entry) => mapping[entry.key] !== undefined);

  const aggregation = useMemo(() => {
    if (!csv || !analyzed || !isMappingComplete) return null;
    return aggregateByProduct(csv.rows.slice(1), mapping as Record<RppFieldKey, number>);
  }, [csv, analyzed, isMappingComplete, mapping]);

  const evaluatedProducts: EvaluatedProduct[] = useMemo(() => {
    if (!aggregation) return [];
    return Array.from(aggregation.products.values()).map((agg) => {
      const kpi = computeKpi(agg);
      const evaluation = evaluateProduct(kpi, settings);
      return { kpi, evaluation };
    });
  }, [aggregation, settings]);

  const totals = useMemo(() => {
    const totalAdCost = evaluatedProducts.reduce((s, p) => s + p.kpi.adCost, 0);
    const totalSales = evaluatedProducts.reduce((s, p) => s + p.kpi.sales, 0);
    const totalClicks = evaluatedProducts.reduce((s, p) => s + p.kpi.clicks, 0);
    const totalOrders = evaluatedProducts.reduce((s, p) => s + p.kpi.orders, 0);
    return {
      totalAdCost,
      totalSales,
      totalClicks,
      totalOrders,
      roas: totalAdCost > 0 ? (totalSales / totalAdCost) * 100 : null,
      cvr: totalClicks > 0 ? (totalOrders / totalClicks) * 100 : null,
      avgCpc: totalClicks > 0 ? totalAdCost / totalClicks : null,
    };
  }, [evaluatedProducts]);

  const statusGroups = useMemo(() => {
    const groups = new Map<ProductStatus, EvaluatedProduct[]>();
    evaluatedProducts.forEach((p) => {
      const list = groups.get(p.evaluation.status) ?? [];
      list.push(p);
      groups.set(p.evaluation.status, list);
    });
    return groups;
  }, [evaluatedProducts]);

  const tabItems = useMemo(() => {
    let list = evaluatedProducts;
    if (tab === "action-needed") list = list.filter((p) => ACTION_STATUSES.includes(p.evaluation.status));
    else if (tab === "good") list = list.filter((p) => GOOD_STATUSES.includes(p.evaluation.status));

    if (statusFilter !== "all") list = list.filter((p) => p.evaluation.status === statusFilter);
    if (search.trim()) {
      const q = search.trim();
      list = list.filter((p) => p.kpi.productKey.includes(q) || p.kpi.productName.includes(q));
    }

    const sorted = [...list];
    switch (sortMode) {
      case "adCost-desc":
        sorted.sort((a, b) => b.kpi.adCost - a.kpi.adCost);
        break;
      case "roas-asc":
        sorted.sort((a, b) => (a.kpi.roas ?? Infinity) - (b.kpi.roas ?? Infinity));
        break;
      case "roas-desc":
        sorted.sort((a, b) => (b.kpi.roas ?? -1) - (a.kpi.roas ?? -1));
        break;
      case "cvr-asc":
        sorted.sort((a, b) => (a.kpi.cvr ?? Infinity) - (b.kpi.cvr ?? Infinity));
        break;
      case "cpc-desc":
        sorted.sort((a, b) => (b.kpi.cpc ?? -1) - (a.kpi.cpc ?? -1));
        break;
      default:
        sorted.sort(
          (a, b) =>
            STATUS_SORT_RANK[a.evaluation.status] - STATUS_SORT_RANK[b.evaluation.status] ||
            b.kpi.adCost - a.kpi.adCost
        );
    }
    return sorted;
  }, [evaluatedProducts, tab, statusFilter, search, sortMode]);

  const toggleSelect = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDownloadCsv = (scope: "all" | "action-needed" | ProductStatus) => {
    let list = evaluatedProducts;
    if (scope === "action-needed") list = list.filter((p) => ACTION_STATUSES.includes(p.evaluation.status));
    else if (scope !== "all") list = list.filter((p) => p.evaluation.status === scope);

    const header = [
      "商品コード",
      "商品名",
      "判定",
      "判定理由",
      "表示回数",
      "クリック",
      "CTR",
      "CPC",
      "広告費",
      "売上",
      "注文",
      "CVR",
      "ROAS",
      "CPA",
    ];
    const rows = list.map((p) => [
      p.kpi.productKey,
      p.kpi.productName,
      STATUS_LABELS[p.evaluation.status],
      p.evaluation.reason,
      String(p.kpi.impressions),
      String(p.kpi.clicks),
      p.kpi.ctr === null ? "" : p.kpi.ctr.toFixed(2),
      p.kpi.cpc === null ? "" : p.kpi.cpc.toFixed(1),
      String(p.kpi.adCost),
      String(p.kpi.sales),
      String(p.kpi.orders),
      p.kpi.cvr === null ? "" : p.kpi.cvr.toFixed(2),
      p.kpi.roas === null ? "" : p.kpi.roas.toFixed(1),
      p.kpi.cpa === null ? "" : p.kpi.cpa.toFixed(1),
    ]);
    const blob = buildCsvBlob([header, ...rows]);
    triggerBlobDownload(blob, `${csv ? baseNameOf(csv.fileName) : "rpp"}_analysis_${scope}.csv`);
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">RPP広告分析</h1>
        <p className="text-sm text-zinc-500">
          RPPレポートCSVをアップロードすると、商品別にROAS・CVR・CPCなどを自動計算し、対応すべき商品を優先表示します。
        </p>
      </header>

      <ToolSection step="1" title="RPPレポートをアップロード">
        <CsvUploadPanel onLoaded={handleLoaded} fileName={csv?.fileName} />
      </ToolSection>

      {csv && (
        <>
          <ToolSection step="2" title="レポート確認・列の対応付け">
            <CsvOverview csv={csv} />
            <ColumnMappingForm
              header={csv.rows[0] ?? []}
              mapping={mapping}
              onChange={(key, idx) => setMapping((prev) => ({ ...prev, [key]: idx }))}
            />
          </ToolSection>

          <ToolSection step="3" title="店舗基準を設定">
            <StoreSettingsForm settings={settings} onChange={handleSettingsChange} />
            <button
              type="button"
              onClick={() => setAnalyzed(true)}
              disabled={!isMappingComplete}
              className="self-start rounded-full bg-red-600 px-8 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              分析する
            </button>
          </ToolSection>
        </>
      )}

      {analyzed && aggregation && (
        <>
          <ToolSection step="4" title="データ品質">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatTile label="正常行" value={`${aggregation.validRows}行`} />
              <StatTile label="エラー行（除外）" value={`${aggregation.errorRows}行`} />
              <StatTile label="商品数" value={`${evaluatedProducts.length}件`} />
              <StatTile label="要確認" value={`${aggregation.negativeValueRows + aggregation.multiNameProductCount}件`} />
            </div>
            {aggregation.multiNameProductCount > 0 && (
              <p className="text-xs text-yellow-700">
                {aggregation.multiNameProductCount}件の商品コードで、複数の異なる商品名が検出されました。
              </p>
            )}
            {aggregation.negativeValueRows > 0 && (
              <p className="text-xs text-yellow-700">{aggregation.negativeValueRows}行でマイナスの数値が検出されました。</p>
            )}
          </ToolSection>

          <div className="grid grid-cols-2 gap-3 rounded-lg border border-zinc-200 bg-white p-5 sm:grid-cols-4 lg:grid-cols-7">
            <StatTile label="広告費" value={`¥${Math.round(totals.totalAdCost).toLocaleString()}`} />
            <StatTile label="広告売上" value={`¥${Math.round(totals.totalSales).toLocaleString()}`} />
            <StatTile label="ROAS" value={totals.roas === null ? "-" : `${totals.roas.toFixed(0)}%`} />
            <StatTile label="クリック" value={totals.totalClicks.toLocaleString()} />
            <StatTile label="注文" value={totals.totalOrders.toLocaleString()} />
            <StatTile label="CVR" value={totals.cvr === null ? "-" : `${totals.cvr.toFixed(2)}%`} />
            <StatTile label="平均CPC" value={totals.avgCpc === null ? "-" : `¥${totals.avgCpc.toFixed(1)}`} />
          </div>

          <div className="flex gap-2 border-b border-zinc-200">
            {(["overview", "action-needed", "all", "good"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setStatusFilter("all");
                }}
                className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
                  tab === t ? "border-red-600 text-red-600" : "border-transparent text-zinc-500 hover:text-zinc-700"
                }`}
              >
                {t === "overview" ? "概要" : t === "action-needed" ? "要対応" : t === "all" ? "全商品" : "好調商品"}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <ToolSection step="●" title="今見るべき商品">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {ACTION_STATUSES.map((status) => {
                  const list = statusGroups.get(status) ?? [];
                  const adCostSum = list.reduce((s, p) => s + p.kpi.adCost, 0);
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        setTab("action-needed");
                        setStatusFilter(status);
                      }}
                      className="flex flex-col gap-1 rounded-xl border border-red-200 bg-red-50 p-4 text-left hover:border-red-400"
                    >
                      <p className="text-xs font-semibold text-red-700">{STATUS_LABELS[status]}</p>
                      <p className="text-2xl font-bold text-red-800">{list.length}商品</p>
                      <p className="text-xs text-red-600">広告費 ¥{Math.round(adCostSum).toLocaleString()}</p>
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {GOOD_STATUSES.map((status) => {
                  const list = statusGroups.get(status) ?? [];
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        setTab("good");
                        setStatusFilter(status);
                      }}
                      className="flex flex-col gap-1 rounded-xl border border-green-200 bg-green-50 p-4 text-left hover:border-green-400"
                    >
                      <p className="text-xs font-semibold text-green-700">{STATUS_LABELS[status]}</p>
                      <p className="text-2xl font-bold text-green-800">{list.length}商品</p>
                    </button>
                  );
                })}
              </div>
            </ToolSection>
          )}

          {tab !== "overview" && (
            <ToolSection step="●" title="商品一覧">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ProductStatus | "all")}
                  className="rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
                >
                  <option value="all">すべての判定</option>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="商品コード・商品名で検索"
                  className="w-56 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
                />
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
                >
                  <option value="adCost-desc">広告費が多い順</option>
                  <option value="roas-asc">ROASが低い順</option>
                  <option value="roas-desc">ROASが高い順</option>
                  <option value="cvr-asc">CVRが低い順</option>
                  <option value="cpc-desc">CPCが高い順</option>
                  <option value="status">判定の優先度順</option>
                </select>
              </div>
              <p className="text-xs text-zinc-400">{tabItems.length}件表示中</p>

              <ProductTable items={tabItems} selected={selected} onToggleSelect={toggleSelect} />

              <div className="flex flex-wrap gap-2">
                <CopyButton
                  getText={() => Array.from(selected).join("\n")}
                  label={`選択した商品コードをコピー（${selected.size}）`}
                  disabled={selected.size === 0}
                />
                <button
                  type="button"
                  onClick={() => handleDownloadCsv("all")}
                  className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
                >
                  全商品をCSV出力
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadCsv("action-needed")}
                  className="rounded-full border border-red-300 px-4 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  要対応のみCSV出力
                </button>
              </div>
            </ToolSection>
          )}
        </>
      )}
    </main>
  );
}
