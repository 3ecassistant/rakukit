"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import CsvUploadPanel from "@/components/tools/CsvUploadPanel";
import CsvOverview from "@/components/tools/CsvOverview";
import ColumnMapping from "@/components/tools/bulk-seo/ColumnMapping";
import ProductDiagnosisTable, { DiagnosedRow } from "@/components/tools/bulk-seo/ProductDiagnosisTable";
import { CsvLoadResult, buildCsvBlob } from "@/lib/csv";
import {
  DEFAULT_SEO_THRESHOLDS,
  ProductDiagnosis,
  ProductSeoStatus,
  SEO_STATUS_LABELS,
  SeoStatusThresholds,
  classifyProductStatus,
  diagnoseProduct,
  loadAllProjectData,
  markDuplicateKeys,
} from "@/lib/bulkSeoCheck";
import { baseNameOf } from "@/lib/naming";
import { triggerBlobDownload } from "@/lib/download";

const THRESHOLDS_STORAGE_KEY = "rakukit-bulk-seo-thresholds";
type SortMode = "status" | "coverage-asc" | "coverage-desc" | "newUnused-desc" | "length" | "productKey";
type QuickFilter = "all" | "low-coverage" | "has-new-unused" | "has-priority" | "no-suggest";

function loadStoredThresholds(): SeoStatusThresholds {
  if (typeof window === "undefined") return DEFAULT_SEO_THRESHOLDS;
  try {
    const raw = window.localStorage.getItem(THRESHOLDS_STORAGE_KEY);
    if (!raw) return DEFAULT_SEO_THRESHOLDS;
    return { ...DEFAULT_SEO_THRESHOLDS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SEO_THRESHOLDS;
  }
}

export default function BulkSeoCheckPage() {
  const [csv, setCsv] = useState<CsvLoadResult | null>(null);
  const [productKeyIndex, setProductKeyIndex] = useState<number | null>(null);
  const [productNameIndex, setProductNameIndex] = useState<number | null>(null);
  const [rootKeywordIndex, setRootKeywordIndex] = useState<number | null>(null);
  const [rootOverrides, setRootOverrides] = useState<Map<string, string>>(new Map());
  const [bulkRootKeyword, setBulkRootKeyword] = useState("");

  const [thresholds, setThresholds] = useState<SeoStatusThresholds>(() => loadStoredThresholds());
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnoses, setDiagnoses] = useState<ProductDiagnosis[] | null>(null);
  const [availableProjectCount, setAvailableProjectCount] = useState<number | null>(null);

  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [statusFilter, setStatusFilter] = useState<ProductSeoStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("status");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const handleLoaded = (result: CsvLoadResult) => {
    setCsv(result);
    setDiagnoses(null);
    setRootOverrides(new Map());
    setSelected(new Set());
    const header = result.rows[0] ?? [];
    const guessKey = header.findIndex((h) => /商品管理番号|商品コード|商品番号/.test(h));
    const guessName = header.findIndex((h) => h.trim() === "商品名");
    const guessRoot = header.findIndex((h) => /起点|SEO起点|root/i.test(h));
    setProductKeyIndex(guessKey >= 0 ? guessKey : null);
    setProductNameIndex(guessName >= 0 ? guessName : null);
    setRootKeywordIndex(guessRoot >= 0 ? guessRoot : null);
  };

  const handleThresholdsChange = (patch: Partial<SeoStatusThresholds>) => {
    setThresholds((prev) => {
      const next = { ...prev, ...patch };
      if (typeof window !== "undefined") window.localStorage.setItem(THRESHOLDS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const dataRows = useMemo(() => csv?.rows.slice(1) ?? [], [csv]);

  const productInputs = useMemo(() => {
    if (!csv || productKeyIndex === null || productNameIndex === null) return [];
    return dataRows.map((row) => {
      const productKey = (row[productKeyIndex] ?? "").trim();
      const csvRoot = rootKeywordIndex !== null ? (row[rootKeywordIndex] ?? "").trim() : "";
      const rootKeyword = rootOverrides.get(productKey) ?? csvRoot;
      return {
        productKey,
        productName: (row[productNameIndex] ?? "").trim(),
        rootKeyword,
      };
    });
  }, [csv, dataRows, productKeyIndex, productNameIndex, rootKeywordIndex, rootOverrides]);

  const unsetRootCount = productInputs.filter((p) => p.productKey && !p.rootKeyword).length;
  const isMappingReady = productKeyIndex !== null && productNameIndex !== null;

  const handleBulkAssignRoot = () => {
    if (!bulkRootKeyword.trim()) return;
    setRootOverrides((prev) => {
      const next = new Map(prev);
      productInputs.forEach((p) => {
        if (p.productKey && !p.rootKeyword) next.set(p.productKey, bulkRootKeyword.trim());
      });
      return next;
    });
  };

  const handleDiagnose = async () => {
    setIsDiagnosing(true);
    try {
      const projectDataMap = await loadAllProjectData();
      setAvailableProjectCount(projectDataMap.size);
      const results = productInputs
        .filter((p) => p.productKey || p.productName)
        .map((input) => diagnoseProduct(input, projectDataMap));
      setDiagnoses(markDuplicateKeys(results));
      setSelected(new Set());
    } finally {
      setIsDiagnosing(false);
    }
  };

  const statusRows: DiagnosedRow[] = useMemo(() => {
    if (!diagnoses) return [];
    return diagnoses.map((d) => ({ diagnosis: d, status: classifyProductStatus(d, thresholds) }));
  }, [diagnoses, thresholds]);

  const statusCounts = useMemo(() => {
    const counts: Record<ProductSeoStatus, number> = { priority: 0, review: 0, good: 0, undiagnosed: 0 };
    statusRows.forEach((r) => counts[r.status]++);
    return counts;
  }, [statusRows]);

  const summary = useMemo(() => {
    const diagnosedRows = statusRows.filter((r) => r.diagnosis.status === "diagnosed");
    const avgCoverage =
      diagnosedRows.length > 0
        ? diagnosedRows.reduce((s, r) => s + (r.diagnosis.coverageRate ?? 0), 0) / diagnosedRows.length
        : null;
    const avgLevel1 =
      diagnosedRows.length > 0
        ? diagnosedRows.reduce((s, r) => s + (r.diagnosis.level1CoverageRate ?? 0), 0) / diagnosedRows.length
        : null;
    const totalNewUnused = diagnosedRows.reduce((s, r) => s + r.diagnosis.newUnusedCount, 0);
    const totalHighPriority = diagnosedRows.reduce((s, r) => s + r.diagnosis.highPriorityCount, 0);
    return { avgCoverage, avgLevel1, totalNewUnused, totalHighPriority, diagnosedCount: diagnosedRows.length };
  }, [statusRows]);

  const filteredRows = useMemo(() => {
    let list = statusRows;
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);

    if (quickFilter === "low-coverage") list = list.filter((r) => (r.diagnosis.coverageRate ?? 100) < 50);
    else if (quickFilter === "has-new-unused") list = list.filter((r) => r.diagnosis.newUnusedCount > 0);
    else if (quickFilter === "has-priority") list = list.filter((r) => r.diagnosis.highPriorityCount > 0);
    else if (quickFilter === "no-suggest") list = list.filter((r) => r.diagnosis.status !== "diagnosed");

    if (search.trim()) {
      const q = search.trim();
      list = list.filter(
        (r) =>
          r.diagnosis.productKey.includes(q) ||
          r.diagnosis.productName.includes(q) ||
          r.diagnosis.rootKeyword.includes(q)
      );
    }

    const statusOrder: Record<ProductSeoStatus, number> = { priority: 0, review: 1, good: 2, undiagnosed: 3 };
    const sorted = [...list];
    switch (sortMode) {
      case "coverage-asc":
        sorted.sort((a, b) => (a.diagnosis.coverageRate ?? 999) - (b.diagnosis.coverageRate ?? 999));
        break;
      case "coverage-desc":
        sorted.sort((a, b) => (b.diagnosis.coverageRate ?? -1) - (a.diagnosis.coverageRate ?? -1));
        break;
      case "newUnused-desc":
        sorted.sort((a, b) => b.diagnosis.newUnusedCount - a.diagnosis.newUnusedCount);
        break;
      case "length":
        sorted.sort((a, b) => a.diagnosis.nameLength - b.diagnosis.nameLength);
        break;
      case "productKey":
        sorted.sort((a, b) => a.diagnosis.productKey.localeCompare(b.diagnosis.productKey, "ja"));
        break;
      default:
        sorted.sort(
          (a, b) =>
            statusOrder[a.status] - statusOrder[b.status] ||
            (a.diagnosis.level1CoverageRate ?? 999) - (b.diagnosis.level1CoverageRate ?? 999)
        );
    }
    return sorted;
  }, [statusRows, statusFilter, quickFilter, search, sortMode]);

  const toggleSelect = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDownloadCsv = () => {
    if (!csv) return;
    const header = [
      "商品コード",
      "商品名",
      "起点キーワード",
      "商品名文字数",
      "サジェスト総数",
      "使用済み数",
      "未使用数",
      "カバー率",
      "1階層カバー率",
      "NEW未使用数",
      "高優先KW数",
      "優先KW",
      "判定",
    ];
    const rows = filteredRows.map(({ diagnosis: d, status }) => [
      d.productKey,
      d.productName,
      d.rootKeyword,
      String(d.nameLength),
      String(d.totalKeywords),
      String(d.usedCount),
      String(d.unusedCount),
      d.coverageRate === null ? "" : d.coverageRate.toFixed(1),
      d.level1CoverageRate === null ? "" : d.level1CoverageRate.toFixed(1),
      String(d.newUnusedCount),
      String(d.highPriorityCount),
      d.priorityKeywords.map((p) => p.keyword).join(" / "),
      SEO_STATUS_LABELS[status],
    ]);
    const blob = buildCsvBlob([header, ...rows]);
    triggerBlobDownload(blob, `${baseNameOf(csv.fileName)}_seo_check.csv`);
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">商品名一括SEO診断</h1>
        <p className="text-sm text-zinc-500">
          商品CSVをアップロードし、商品ごとの起点キーワードと既存のサジェストデータを照合して、商品名を見直すべき優先順位を一括で出します。
        </p>
      </header>

      <ToolSection step="1" title="商品CSVをアップロード">
        <CsvUploadPanel onLoaded={handleLoaded} fileName={csv?.fileName} />
      </ToolSection>

      {csv && (
        <>
          <ToolSection step="2" title="列設定">
            <CsvOverview csv={csv} />
            <ColumnMapping
              header={csv.rows[0] ?? []}
              productKeyIndex={productKeyIndex}
              productNameIndex={productNameIndex}
              rootKeywordIndex={rootKeywordIndex}
              onChange={(patch) => {
                if (patch.productKeyIndex !== undefined) setProductKeyIndex(patch.productKeyIndex);
                if (patch.productNameIndex !== undefined) setProductNameIndex(patch.productNameIndex);
                if (patch.rootKeywordIndex !== undefined) setRootKeywordIndex(patch.rootKeywordIndex);
              }}
            />
            {isMappingReady && (
              <p className="text-xs text-zinc-500">
                商品数 {productInputs.filter((p) => p.productKey).length}件 ／ 起点未設定 {unsetRootCount}件
              </p>
            )}
          </ToolSection>

          {isMappingReady && unsetRootCount > 0 && (
            <ToolSection step="3" title="起点キーワードの一括設定（任意）">
              <p className="text-xs text-zinc-500">
                起点未設定の{unsetRootCount}件に、同じ起点キーワードをまとめて設定できます。商品ごとに異なる起点を使う場合はCSV側に起点列を用意してください。
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={bulkRootKeyword}
                  onChange={(e) => setBulkRootKeyword(e.target.value)}
                  placeholder="例: トートバッグ"
                  className="w-56 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={handleBulkAssignRoot}
                  disabled={!bulkRootKeyword.trim()}
                  className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium hover:border-red-400 disabled:opacity-40"
                >
                  起点未設定の商品に適用
                </button>
              </div>
            </ToolSection>
          )}

          <ToolSection step="4" title="判定基準・診断実行">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-xs text-zinc-600">
                良好の目安（1階層カバー率）
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={thresholds.goodLevel1Coverage}
                    onChange={(e) => handleThresholdsChange({ goodLevel1Coverage: Number(e.target.value) })}
                    className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                  />
                  <span className="text-zinc-400">%</span>
                </div>
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-600">
                要確認の目安（1階層カバー率）
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={thresholds.reviewLevel1Coverage}
                    onChange={(e) => handleThresholdsChange({ reviewLevel1Coverage: Number(e.target.value) })}
                    className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                  />
                  <span className="text-zinc-400">%</span>
                </div>
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-600">
                高優先KW警戒件数
                <input
                  type="number"
                  value={thresholds.highPriorityWarningCount}
                  onChange={(e) => handleThresholdsChange({ highPriorityWarningCount: Number(e.target.value) })}
                  className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={handleDiagnose}
              disabled={!isMappingReady || isDiagnosing}
              className="self-start rounded-full bg-red-600 px-8 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isDiagnosing ? "診断中…" : "一括診断する"}
            </button>
            {availableProjectCount === 0 && (
              <p className="text-xs text-yellow-700">
                サジェストプロジェクトが登録されていません。先に
                <Link href="/tools/suggest-trend" className="underline">
                  サジェスト差分・トレンド
                </Link>
                でキーワードを登録・取得してください。
              </p>
            )}
          </ToolSection>
        </>
      )}

      {diagnoses && (
        <>
          <ToolSection step="5" title="診断サマリー">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatTile label="診断商品" value={`${summary.diagnosedCount}商品`} />
              <StatTile label="平均カバー率" value={summary.avgCoverage === null ? "-" : `${summary.avgCoverage.toFixed(1)}%`} />
              <StatTile label="1階層平均" value={summary.avgLevel1 === null ? "-" : `${summary.avgLevel1.toFixed(1)}%`} />
              <StatTile label="NEW未使用合計" value={`${summary.totalNewUnused}件`} />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(["priority", "review", "good", "undiagnosed"] as ProductSeoStatus[]).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`flex flex-col gap-1 rounded-xl border p-4 text-left ${
                    status === "priority"
                      ? "border-red-200 bg-red-50 hover:border-red-400"
                      : status === "review"
                        ? "border-yellow-200 bg-yellow-50 hover:border-yellow-400"
                        : status === "good"
                          ? "border-green-200 bg-green-50 hover:border-green-400"
                          : "border-zinc-200 bg-zinc-50 hover:border-zinc-400"
                  }`}
                >
                  <p className="text-xs font-semibold text-zinc-700">{SEO_STATUS_LABELS[status]}</p>
                  <p className="text-2xl font-black text-zinc-900">{statusCounts[status]}商品</p>
                </button>
              ))}
            </div>
          </ToolSection>

          <ToolSection step="6" title="商品一覧（改善優先度の高い順）">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ProductSeoStatus | "all")}
                className="rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
              >
                <option value="all">すべての判定</option>
                {(Object.keys(SEO_STATUS_LABELS) as ProductSeoStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {SEO_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <select
                value={quickFilter}
                onChange={(e) => setQuickFilter(e.target.value as QuickFilter)}
                className="rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
              >
                <option value="all">クイックフィルターなし</option>
                <option value="low-coverage">カバー率50%未満</option>
                <option value="has-new-unused">NEW未使用あり</option>
                <option value="has-priority">高優先KWあり</option>
                <option value="no-suggest">サジェスト未設定</option>
              </select>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="商品コード・商品名・起点KWで検索"
                className="w-56 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
              />
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
              >
                <option value="status">改善優先度順</option>
                <option value="coverage-asc">カバー率が低い順</option>
                <option value="coverage-desc">カバー率が高い順</option>
                <option value="newUnused-desc">NEW未使用が多い順</option>
                <option value="length">商品名文字数順</option>
                <option value="productKey">商品コード順</option>
              </select>
            </div>
            <p className="text-xs text-zinc-400">{filteredRows.length}件表示中</p>

            <ProductDiagnosisTable rows={filteredRows} selected={selected} onToggleSelect={toggleSelect} />

            <div className="flex flex-wrap gap-2">
              <CopyButton
                getText={() => Array.from(selected).join("\n")}
                label={`選択した商品コードをコピー（${selected.size}）`}
                disabled={selected.size === 0}
              />
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                表示中の結果をCSV出力
              </button>
            </div>
          </ToolSection>
        </>
      )}
    </main>
  );
}
