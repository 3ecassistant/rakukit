"use client";

import { useEffect, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import { buildCsvBlob } from "@/lib/csv";
import { triggerBlobDownload } from "@/lib/download";
import { normalizeItem, RakutenItem } from "@/lib/rakutenItem";
import { RakutenRawItem } from "@/lib/rakutenIchibaApi";
import { ComparisonResult, PriceResearchAnalysis, analyzePriceResearch, compareWithPrevious } from "@/lib/priceResearchAnalysis";
import {
  DataCounts,
  MarketSnapshot,
  StorageUsage,
  buildSearchKey,
  deleteAllData,
  deleteSearchData,
  estimateStorageUsage,
  getDataCounts,
  getLatestPriceSnapshotsByItem,
  getMarketSnapshotHistory,
  getProductsByItemCodes,
  saveMarketSnapshot,
  savePriceSnapshots,
  upsertProducts,
  upsertSearchCondition,
} from "@/lib/priceResearchDb";

interface FormState {
  keyword: string;
  genreId: string;
  shopCode: string;
  minPrice: string;
  maxPrice: string;
  requestedCount: 30 | 100 | 300 | 1000 | 3000;
  ownPrice: string;
}

const DEFAULT_FORM: FormState = {
  keyword: "",
  genreId: "",
  shopCode: "",
  minPrice: "",
  maxPrice: "",
  requestedCount: 300,
  ownPrice: "",
};

interface ResultState {
  items: RakutenItem[];
  analysis: PriceResearchAnalysis;
  comparison: ComparisonResult | null;
  checkedAt: string;
  searchKey: string;
  isFirstSearch: boolean;
}

function fmtYen(v: number): string {
  return `¥${Math.round(v).toLocaleString()}`;
}
function fmtPct(v: number, digits = 1): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}
function fmtBytes(bytes: number | null): string {
  if (bytes === null) return "-";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function PriceResearchPage() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);
  const [marketHistory, setMarketHistory] = useState<MarketSnapshot[]>([]);
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  const [dataCounts, setDataCounts] = useState<DataCounts | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  const update = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const refreshStorageInfo = async () => {
    try {
      const [usage, counts] = await Promise.all([estimateStorageUsage(), getDataCounts()]);
      setStorageUsage(usage);
      setDataCounts(counts);
    } catch (err) {
      setDbError(err instanceof Error ? err.message : "ローカルデータの取得に失敗しました");
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => refreshStorageInfo(), 0);
    return () => clearTimeout(timer);
  }, []);

  const handleSearch = async () => {
    if (!form.keyword.trim()) {
      setError("検索キーワードを入力してください");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/price-research-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: form.keyword.trim(),
          genreId: form.genreId.trim() || undefined,
          shopCode: form.shopCode.trim() || undefined,
          minPrice: form.minPrice ? Number(form.minPrice) : undefined,
          maxPrice: form.maxPrice ? Number(form.maxPrice) : undefined,
          requestedCount: form.requestedCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? `検索に失敗しました（HTTP ${res.status}）`);
        return;
      }

      const rawItems = data.items as RakutenRawItem[];
      const totalCount = data.totalCount as number;
      const checkedAt = data.checkedAt as string;
      const items = rawItems.map(normalizeItem);
      const ownPrice = form.ownPrice ? Number(form.ownPrice) : null;
      const analysis = analyzePriceResearch(rawItems, totalCount, ownPrice);

      const genreId = form.genreId.trim();
      const minPrice = form.minPrice ? Number(form.minPrice) : null;
      const maxPrice = form.maxPrice ? Number(form.maxPrice) : null;
      const searchKey = buildSearchKey({ keyword: form.keyword.trim(), genreId, minPrice, maxPrice });

      let comparison: ComparisonResult | null = null;
      let isFirstSearch = true;
      try {
        const previousSnapshots = await getLatestPriceSnapshotsByItem(searchKey);
        isFirstSearch = previousSnapshots.size === 0;
        if (!isFirstSearch) {
          const previousPriceByItemCode = new Map(Array.from(previousSnapshots.entries()).map(([code, snap]) => [code, snap.itemPrice]));
          const previousProducts = await getProductsByItemCodes(Array.from(previousSnapshots.keys()));
          const previousNameByItemCode = new Map(Array.from(previousProducts.entries()).map(([code, p]) => [code, p.itemName]));
          comparison = compareWithPrevious(items, previousPriceByItemCode, previousNameByItemCode);
        }

        await upsertSearchCondition({ searchKey, keyword: form.keyword.trim(), genreId, minPrice, maxPrice, requestedCount: form.requestedCount });
        await upsertProducts(items.map((i) => ({ itemCode: i.itemCode, itemName: i.itemName, shopCode: i.shopCode, shopName: i.shopName, itemUrl: i.itemUrl, lastSeenAt: checkedAt })));
        await savePriceSnapshots(
          items.map((i, idx) => ({
            checkedAt,
            searchKey,
            itemCode: i.itemCode,
            itemPrice: i.itemPrice,
            reviewCount: i.reviewCount,
            reviewAverage: i.reviewAverage,
            postageFlag: i.postageFlag,
            pointRate: i.pointRate,
            apiPosition: idx + 1,
          }))
        );
        await saveMarketSnapshot({
          checkedAt,
          searchKey,
          itemCount: analysis.itemCount,
          minPrice: analysis.price.min,
          maxPrice: analysis.price.max,
          averagePrice: analysis.price.mean,
          medianPrice: analysis.price.median,
          q1: analysis.price.q1,
          q3: analysis.price.q3,
          reviewMedian: analysis.reviewMedian,
          freeShippingRate: analysis.freeShippingRate,
          pointUpRate: analysis.pointUpRate,
        });

        const history = await getMarketSnapshotHistory(searchKey);
        setMarketHistory(history);
        await refreshStorageInfo();
        setDbError(null);
      } catch (err) {
        setDbError(err instanceof Error ? err.message : "この端末への保存に失敗しました（IndexedDB非対応の可能性があります）");
      }

      setResult({ items, analysis, comparison, checkedAt, searchKey, isFirstSearch });
    } catch {
      setError("通信エラーが発生しました。しばらく待って再度お試しください");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExportItemsCsv = () => {
    if (!result) return;
    const rows: string[][] = [
      ["checkedAt", "keyword", "itemCode", "itemName", "itemPrice", "reviewCount", "shopName", "apiPosition"],
      ...result.items.map((item, i) => [result.checkedAt, form.keyword, item.itemCode, item.itemName, String(item.itemPrice), String(item.reviewCount), item.shopName, String(i + 1)]),
    ];
    triggerBlobDownload(buildCsvBlob(rows), `price-research-items_${form.keyword}.csv`);
  };

  const handleExportHistoryCsv = () => {
    if (marketHistory.length === 0) return;
    const rows: string[][] = [
      ["日時", "商品数", "中央値", "平均", "Q1", "Q3", "レビュー中央値"],
      ...marketHistory.map((h) => [h.checkedAt, String(h.itemCount), String(Math.round(h.medianPrice)), String(Math.round(h.averagePrice)), String(Math.round(h.q1)), String(Math.round(h.q3)), String(Math.round(h.reviewMedian))]),
    ];
    triggerBlobDownload(buildCsvBlob(rows), `price-research-history_${form.keyword}.csv`);
  };

  const handleDeleteThisSearch = async () => {
    if (!result) return;
    if (!window.confirm(`「${form.keyword}」の保存済み価格調査履歴をこの端末から削除します。よろしいですか？`)) return;
    await deleteSearchData(result.searchKey);
    setMarketHistory([]);
    await refreshStorageInfo();
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("この端末に保存されているすべての価格調査データを削除します。元に戻せません。よろしいですか？")) return;
    await deleteAllData();
    setMarketHistory([]);
    setResult(null);
    await refreshStorageInfo();
  };

  const usageRatioPct = storageUsage?.usageRatio !== null && storageUsage?.usageRatio !== undefined ? storageUsage.usageRatio * 100 : null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">楽天市場 価格調査ツール</h1>
        <p className="text-sm text-zinc-500">
          楽天市場商品検索APIで競合価格を取得し、市場価格中央値・価格帯分布・自社価格ポジションを分析します。
          <strong className="font-semibold text-zinc-700">価格履歴は当サービスのサーバーには保存されず、この端末のブラウザ内（IndexedDB）にのみ保存されます。</strong>
          別端末への自動同期は行われません。
        </p>
      </header>

      <ToolSection step="1" title="検索条件">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-zinc-600 sm:col-span-2">
            検索キーワード（必須）
            <input type="text" value={form.keyword} onChange={(e) => update({ keyword: e.target.value })} placeholder="例：トートバッグ レディース" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            ジャンルID（任意）
            <input type="text" value={form.genreId} onChange={(e) => update({ genreId: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            shopCode（任意）
            <input type="text" value={form.shopCode} onChange={(e) => update({ shopCode: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            最低価格（任意）
            <input type="number" value={form.minPrice} onChange={(e) => update({ minPrice: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            最高価格（任意）
            <input type="number" value={form.maxPrice} onChange={(e) => update({ maxPrice: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            取得商品数
            <select value={form.requestedCount} onChange={(e) => update({ requestedCount: Number(e.target.value) as FormState["requestedCount"] })} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400">
              <option value={30}>30件</option>
              <option value={100}>100件</option>
              <option value={300}>300件</option>
              <option value={1000}>1,000件</option>
              <option value={3000}>3,000件</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            自社価格（任意）
            <input type="number" value={form.ownPrice} onChange={(e) => update({ ownPrice: e.target.value })} placeholder="例：4980" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
          </label>
        </div>
        <button type="button" onClick={handleSearch} disabled={loading} className="self-start rounded-full bg-red-600 px-6 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
          {loading ? "調査中..." : "調査する"}
        </button>
      </ToolSection>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}
      {dbError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs text-amber-700">⚠ この端末への保存でエラーが発生しました：{dbError}（分析結果の表示自体は可能です）</p>
        </div>
      )}

      {result && (
        <>
          <ToolSection step="2" title="市場サマリー">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="検索該当商品数" value={`${result.analysis.marketTotalCount.toLocaleString()}件`} />
              <StatTile label="分析商品数" value={`${result.analysis.itemCount.toLocaleString()}商品`} />
              <StatTile label="価格中央値" value={fmtYen(result.analysis.price.median)} />
              <StatTile label="平均価格" value={fmtYen(result.analysis.price.mean)} />
              <StatTile label="Q1" value={fmtYen(result.analysis.price.q1)} />
              <StatTile label="Q3" value={fmtYen(result.analysis.price.q3)} />
              <StatTile label="IQR" value={fmtYen(result.analysis.iqr)} />
              <StatTile label="中心価格帯" value={result.analysis.mostCommonBand?.label ?? "-"} />
            </div>
            <p className="text-xs text-zinc-400">取得日時：{new Date(result.checkedAt).toLocaleString("ja-JP")}</p>
          </ToolSection>

          {result.analysis.own && (
            <ToolSection step="3" title="自社価格比較">
              <div className="rounded-lg border border-zinc-200 bg-white p-5 text-center">
                <p className="text-xs text-zinc-400">自社価格{fmtYen(result.analysis.own.price)}は</p>
                <p className="text-3xl font-bold text-zinc-900">{result.analysis.own.position}</p>
                <p className="mt-1 text-sm text-zinc-500">市場価格パーセンタイル 約{result.analysis.own.percentile.toFixed(0)}%</p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
                <StatTile label="市場中央値との差" value={fmtYen(result.analysis.own.diff)} />
                <StatTile label="市場中央値比" value={fmtPct(result.analysis.own.diffRate)} />
              </div>
            </ToolSection>
          )}

          <ToolSection step="4" title="価格帯分布">
            <div className="flex flex-col gap-1.5">
              {result.analysis.priceBands.map((band) => (
                <div key={band.label} className="flex items-center gap-2 text-xs">
                  <span className="w-32 shrink-0 text-zinc-500">{band.label}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-100">
                    <div className="h-full rounded-full bg-red-500" style={{ width: `${band.ratio}%` }} />
                  </div>
                  <span className="w-40 shrink-0 text-right text-zinc-500">
                    {band.count}件（{band.ratio.toFixed(1)}%）レビュー中央値{Math.round(band.reviewMedian)}件
                  </span>
                </div>
              ))}
            </div>
          </ToolSection>

          <ToolSection step="5" title="レビュー・送料・ポイントとの価格クロス分析">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="高レビュー(500件以上) 価格中央値" value={result.analysis.highReviewGroup.count > 0 ? fmtYen(result.analysis.highReviewGroup.price.median) : "-"} />
              <StatTile label="高評価(4.3以上・100件以上) 価格中央値" value={result.analysis.highRatingGroup.count > 0 ? fmtYen(result.analysis.highRatingGroup.price.median) : "-"} />
              <StatTile label="送料込み 価格中央値" value={result.analysis.shippingPrice.included.count > 0 ? fmtYen(result.analysis.shippingPrice.included.median) : "-"} />
              <StatTile label="送料別 価格中央値" value={result.analysis.shippingPrice.separate.count > 0 ? fmtYen(result.analysis.shippingPrice.separate.median) : "-"} />
              <StatTile label="ポイントUP商品 価格中央値" value={result.analysis.pointPrice.pointUp.count > 0 ? fmtYen(result.analysis.pointPrice.pointUp.median) : "-"} />
              <StatTile label="通常ポイント商品 価格中央値" value={result.analysis.pointPrice.normal.count > 0 ? fmtYen(result.analysis.pointPrice.normal.median) : "-"} />
            </div>
          </ToolSection>

          <ToolSection step="6" title="ショップ別価格">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-zinc-500">
                    <th className="py-1.5 pr-2">ショップ名</th>
                    <th className="py-1.5 pr-2 text-right">商品数</th>
                    <th className="py-1.5 pr-2 text-right">価格中央値</th>
                    <th className="py-1.5 pr-2 text-right">最低〜最高</th>
                    <th className="py-1.5 pr-2 text-right">レビュー中央値</th>
                  </tr>
                </thead>
                <tbody>
                  {result.analysis.shopPrice.slice(0, 10).map((s) => (
                    <tr key={s.shopCode} className="border-b border-zinc-100">
                      <td className="py-1.5 pr-2">{s.shopName}</td>
                      <td className="py-1.5 pr-2 text-right">{s.count}</td>
                      <td className="py-1.5 pr-2 text-right">{fmtYen(s.priceMedian)}</td>
                      <td className="py-1.5 pr-2 text-right">{fmtYen(s.priceMin)}〜{fmtYen(s.priceMax)}</td>
                      <td className="py-1.5 pr-2 text-right">{Math.round(s.reviewMedian).toLocaleString()}件</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ToolSection>

          <ToolSection step="7" title="前回調査との差分">
            {result.isFirstSearch ? (
              <p className="text-sm text-zinc-500">この検索条件での調査は初回のため、比較対象がありません。次回同じ条件で調査すると、ここに前回との差分が表示されます。</p>
            ) : result.comparison ? (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatTile label="値下げ商品" value={`${result.comparison.priceDrops.length}件`} />
                  <StatTile label="値上げ商品" value={`${result.comparison.priceRises.length}件`} />
                  <StatTile label="新規出現商品" value={`${result.comparison.newlyAppeared.length}件`} />
                  <StatTile label="今回取得範囲外" value={`${result.comparison.outOfRange.length}件`} />
                </div>
                {result.comparison.priceDrops.length > 0 && (
                  <div>
                    <p className="pt-2 text-sm font-semibold text-zinc-700">値下げ商品</p>
                    <ul className="mt-1 flex flex-col gap-1 text-xs">
                      {result.comparison.priceDrops.slice(0, 15).map((e) => (
                        <li key={e.itemCode} className="flex items-center justify-between border-b border-zinc-100 pb-1">
                          <a href={e.itemUrl} target="_blank" rel="noopener noreferrer" className="truncate text-red-700 hover:underline">
                            {e.itemName}
                          </a>
                          <span className="shrink-0 text-zinc-500">
                            {fmtYen(e.oldPrice)} → {fmtYen(e.newPrice)}（{fmtPct(e.diffRate)}）
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.comparison.priceRises.length > 0 && (
                  <div>
                    <p className="pt-2 text-sm font-semibold text-zinc-700">値上げ商品</p>
                    <ul className="mt-1 flex flex-col gap-1 text-xs">
                      {result.comparison.priceRises.slice(0, 15).map((e) => (
                        <li key={e.itemCode} className="flex items-center justify-between border-b border-zinc-100 pb-1">
                          <a href={e.itemUrl} target="_blank" rel="noopener noreferrer" className="truncate text-red-700 hover:underline">
                            {e.itemName}
                          </a>
                          <span className="shrink-0 text-zinc-500">
                            {fmtYen(e.oldPrice)} → {fmtYen(e.newPrice)}（{fmtPct(e.diffRate)}）
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : null}
          </ToolSection>

          <ToolSection step="8" title="市場価格中央値の推移">
            {marketHistory.length <= 1 ? (
              <p className="text-sm text-zinc-500">履歴が1件のみのため推移は表示できません。今後同じ条件で調査を重ねると、ここに推移が表示されます。</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {marketHistory.map((h) => {
                  const maxMedian = Math.max(...marketHistory.map((m) => m.medianPrice));
                  return (
                    <div key={h.id} className="flex items-center gap-2 text-xs">
                      <span className="w-32 shrink-0 text-zinc-500">{new Date(h.checkedAt).toLocaleDateString("ja-JP")}</span>
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-100">
                        <div className="h-full rounded-full bg-amber-500" style={{ width: `${maxMedian === 0 ? 0 : (h.medianPrice / maxMedian) * 100}%` }} />
                      </div>
                      <span className="w-24 shrink-0 text-right text-zinc-500">{fmtYen(h.medianPrice)}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <button type="button" onClick={handleExportHistoryCsv} disabled={marketHistory.length === 0} className="self-start rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-medium text-zinc-600 hover:border-red-400 disabled:opacity-50">
              市場推移CSVを出力
            </button>
          </ToolSection>

          <ToolSection step="9" title="競合商品一覧・CSV出力">
            <button type="button" onClick={handleExportItemsCsv} className="self-start rounded-full bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700">
              商品一覧CSVを出力
            </button>
            <div className="mt-2 max-h-96 overflow-auto rounded-lg border border-zinc-100">
              <table className="w-full min-w-[680px] text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-zinc-200 text-left text-zinc-500">
                    <th className="py-1.5 pr-2">順位</th>
                    <th className="py-1.5 pr-2">商品名</th>
                    <th className="py-1.5 pr-2">ショップ名</th>
                    <th className="py-1.5 pr-2 text-right">価格</th>
                    <th className="py-1.5 pr-2 text-right">レビュー</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((item, i) => (
                    <tr key={item.itemCode} className="border-b border-zinc-100">
                      <td className="py-1.5 pr-2 text-zinc-400">{i + 1}</td>
                      <td className="py-1.5 pr-2">
                        <a href={item.itemUrl} target="_blank" rel="noopener noreferrer" className="text-red-700 hover:underline">
                          {item.itemName}
                        </a>
                      </td>
                      <td className="py-1.5 pr-2">{item.shopName}</td>
                      <td className="py-1.5 pr-2 text-right">{fmtYen(item.itemPrice)}</td>
                      <td className="py-1.5 pr-2 text-right">
                        {item.reviewCount}件（{item.reviewAverage.toFixed(2)}）
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ToolSection>
        </>
      )}

      <ToolSection step={result ? "10" : "2"} title="この端末に保存されているデータ">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="保存された検索条件" value={`${dataCounts?.searchConditions ?? 0}件`} />
          <StatTile label="保存商品数" value={`${dataCounts?.products ?? 0}件`} />
          <StatTile label="価格履歴件数" value={`${dataCounts?.priceSnapshots ?? 0}件`} />
          <StatTile label="市場スナップショット" value={`${dataCounts?.marketSnapshots ?? 0}件`} />
        </div>
        {usageRatioPct !== null ? (
          <div className="flex flex-col gap-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
              <div className={`h-full rounded-full ${usageRatioPct >= 85 ? "bg-red-500" : usageRatioPct >= 70 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${Math.min(100, usageRatioPct)}%` }} />
            </div>
            <p className="text-xs text-zinc-500">
              使用量 {fmtBytes(storageUsage?.usageBytes ?? null)} / 利用可能 {fmtBytes(storageUsage?.quotaBytes ?? null)}（{usageRatioPct.toFixed(1)}%）
              {usageRatioPct >= 85 && "　⚠ 容量を圧迫しています。古い履歴の削除をご検討ください。"}
            </p>
          </div>
        ) : (
          <p className="text-xs text-zinc-400">このブラウザではストレージ使用量を取得できませんでした。</p>
        )}
        <div className="flex flex-wrap gap-2">
          {result && (
            <button type="button" onClick={handleDeleteThisSearch} className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-medium text-zinc-600 hover:border-red-400">
              「{form.keyword}」の履歴のみ削除
            </button>
          )}
          <button type="button" onClick={handleDeleteAll} className="rounded-full border border-red-300 px-4 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
            すべてのローカルデータを削除
          </button>
        </div>
        <p className="text-xs text-zinc-400">
          価格調査履歴は、この端末のブラウザ内（IndexedDB）に保存されます。当サービスのサーバーには価格履歴を原則保存しません。ブラウザデータの削除・端末の故障等でローカルデータは失われる可能性があります。
        </p>
      </ToolSection>
    </main>
  );
}
