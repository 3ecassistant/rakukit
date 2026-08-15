"use client";

import { useEffect, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import { buildCsvBlob } from "@/lib/csv";
import { triggerBlobDownload } from "@/lib/download";
import { ProductDiffResult, ProductMaster, ShopMaster } from "@/lib/shopDiffChecker";

const SHOPS_KEY = "rakukit.shopDiffChecker.shops";
const PRODUCTS_KEY = "rakukit.shopDiffChecker.products";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const STATUS_LABEL: Record<ProductDiffResult["overallStatus"], string> = {
  match: "○ 正常",
  diff: "！ 差異あり",
  critical: "× 重大差異",
  unavailable: "－ 取得不可",
};

export default function ShopDiffCheckerPage() {
  const [shops, setShops] = useState<ShopMaster[]>(() => loadFromStorage<ShopMaster[]>(SHOPS_KEY, []));
  const [products, setProducts] = useState<ProductMaster[]>(() => loadFromStorage<ProductMaster[]>(PRODUCTS_KEY, []));
  const [baseShopId, setBaseShopId] = useState<string>(() => loadFromStorage<ShopMaster[]>(SHOPS_KEY, [])[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ProductDiffResult[] | null>(null);
  const [filter, setFilter] = useState<"all" | "diff" | "critical">("all");

  useEffect(() => {
    window.localStorage.setItem(SHOPS_KEY, JSON.stringify(shops));
  }, [shops]);
  useEffect(() => {
    window.localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  }, [products]);

  const addShop = () => {
    const shop: ShopMaster = { id: uid(), shopCode: "", shopName: "" };
    setShops((prev) => [...prev, shop]);
    if (!baseShopId) setBaseShopId(shop.id);
  };
  const updateShop = (id: string, patch: Partial<ShopMaster>) => setShops((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const removeShop = (id: string) => {
    setShops((prev) => prev.filter((s) => s.id !== id));
    setProducts((prev) =>
      prev.map((p) => {
        const rest = { ...p.itemCodesByShop };
        delete rest[id];
        return { ...p, itemCodesByShop: rest };
      })
    );
    if (baseShopId === id) setBaseShopId(shops.find((s) => s.id !== id)?.id ?? "");
  };

  const addProduct = () => setProducts((prev) => [...prev, { commonCode: "", productName: "", itemCodesByShop: {} }]);
  const updateProduct = (index: number, patch: Partial<ProductMaster>) =>
    setProducts((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  const updateItemCode = (index: number, shopId: string, itemCode: string) =>
    setProducts((prev) => prev.map((p, i) => (i === index ? { ...p, itemCodesByShop: { ...p.itemCodesByShop, [shopId]: itemCode } } : p)));
  const removeProduct = (index: number) => setProducts((prev) => prev.filter((_, i) => i !== index));

  const handleCheck = async () => {
    if (shops.length === 0 || products.length === 0 || !baseShopId) {
      setError("店舗マスタ・商品マスタを1件以上登録し、基準店舗を選択してください");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/shop-diff-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shops, products, baseShopId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? `チェックに失敗しました（HTTP ${res.status}）`);
        setResults(null);
        return;
      }
      setResults(data.results as ProductDiffResult[]);
    } catch {
      setError("通信エラーが発生しました。しばらく待って再度お試しください");
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = (results ?? []).filter((r) => {
    if (filter === "diff") return r.diffCount > 0 || r.unavailableCount > 0;
    if (filter === "critical") return r.criticalDiffCount > 0;
    return true;
  });

  const handleExportCsv = () => {
    if (!results) return;
    const rows: string[][] = [["共通商品コード", "商品名", "総合ステータス", "差異件数", "重大差異件数", "取得不可件数"]];
    for (const r of results) {
      rows.push([r.commonCode, r.productName, STATUS_LABEL[r.overallStatus], String(r.diffCount), String(r.criticalDiffCount), String(r.unavailableCount)]);
      for (const f of r.fields.filter((f) => f.hasDiff)) {
        rows.push(["", `　└ ${f.label}`, `基準: ${f.baseValue}`, "", "", ""]);
      }
    }
    triggerBlobDownload(buildCsvBlob(rows), "shop-diff-check.csv");
  };

  const summary = results
    ? {
        total: results.length,
        match: results.filter((r) => r.overallStatus === "match").length,
        diff: results.filter((r) => r.overallStatus === "diff").length,
        critical: results.filter((r) => r.overallStatus === "critical").length,
        unavailable: results.filter((r) => r.overallStatus === "unavailable").length,
      }
    : null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">楽天市場 13店舗 商品設定差異チェックツール</h1>
        <p className="text-sm text-zinc-500">
          同一商品を複数店舗で販売している場合の、価格・販売可否・送料・商品名・ジャンル・商品別ポイント倍率の設定差異を一括検出します。店舗マスタ・商品マスタはこのブラウザ内にのみ保存され、サーバーには送信時のみ利用されます。
        </p>
      </header>

      <ToolSection step="1" title="店舗マスタ">
        <div className="flex flex-col gap-2">
          {shops.map((shop) => (
            <div key={shop.id} className="flex items-center gap-2">
              <input
                type="text"
                value={shop.shopName}
                onChange={(e) => updateShop(shop.id, { shopName: e.target.value })}
                placeholder="店舗名"
                className="w-40 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400"
              />
              <input
                type="text"
                value={shop.shopCode}
                onChange={(e) => updateShop(shop.id, { shopCode: e.target.value })}
                placeholder="shopCode"
                className="w-40 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400"
              />
              <label className="flex items-center gap-1 text-xs text-zinc-500">
                <input type="radio" name="baseShop" checked={baseShopId === shop.id} onChange={() => setBaseShopId(shop.id)} />
                基準店舗
              </label>
              <button type="button" onClick={() => removeShop(shop.id)} className="text-xs text-red-600 hover:underline">
                削除
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addShop} className="self-start rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-medium text-zinc-600 hover:border-red-400">
          + 店舗を追加
        </button>
      </ToolSection>

      <ToolSection step="2" title="商品マスタ（共通商品コード・店舗別itemCode）">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-xs">
            <thead>
              <tr className="text-left text-zinc-500">
                <th className="py-1 pr-2">共通商品コード</th>
                <th className="py-1 pr-2">商品名</th>
                {shops.map((s) => (
                  <th key={s.id} className="py-1 pr-2">
                    {s.shopName || "(店舗名未設定)"} itemCode
                  </th>
                ))}
                <th className="py-1 pr-2"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr key={i}>
                  <td className="py-1 pr-2">
                    <input type="text" value={p.commonCode} onChange={(e) => updateProduct(i, { commonCode: e.target.value })} className="w-28 rounded-lg border border-zinc-300 px-2 py-1 outline-none focus:border-red-400" />
                  </td>
                  <td className="py-1 pr-2">
                    <input type="text" value={p.productName} onChange={(e) => updateProduct(i, { productName: e.target.value })} className="w-40 rounded-lg border border-zinc-300 px-2 py-1 outline-none focus:border-red-400" />
                  </td>
                  {shops.map((s) => (
                    <td key={s.id} className="py-1 pr-2">
                      <input
                        type="text"
                        value={p.itemCodesByShop[s.id] ?? ""}
                        onChange={(e) => updateItemCode(i, s.id, e.target.value)}
                        placeholder="shop:12345"
                        className="w-32 rounded-lg border border-zinc-300 px-2 py-1 outline-none focus:border-red-400"
                      />
                    </td>
                  ))}
                  <td className="py-1 pr-2">
                    <button type="button" onClick={() => removeProduct(i)} className="text-red-600 hover:underline">
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={addProduct} className="self-start rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-medium text-zinc-600 hover:border-red-400">
          + 商品を追加
        </button>
        <button type="button" onClick={handleCheck} disabled={loading} className="self-start rounded-full bg-red-600 px-6 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
          {loading ? "チェック中..." : "全商品チェックを実行"}
        </button>
      </ToolSection>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      {results && summary && (
        <>
          <ToolSection step="3" title="サマリー">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <StatTile label="チェック商品数" value={`${summary.total}件`} />
              <StatTile label="正常" value={`${summary.match}件`} />
              <StatTile label="差異あり" value={`${summary.diff}件`} />
              <StatTile label="重大差異" value={`${summary.critical}件`} />
              <StatTile label="取得不可" value={`${summary.unavailable}件`} />
            </div>
          </ToolSection>

          <ToolSection step="4" title="差異商品一覧">
            <div className="flex gap-2">
              {(["all", "diff", "critical"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${filter === f ? "border-red-600 bg-red-600 text-white" : "border-zinc-300 text-zinc-600 hover:border-red-400"}`}
                >
                  {f === "all" ? "すべて" : f === "diff" ? "差異ありのみ" : "重大差異のみ"}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              {filteredResults.map((r) => (
                <div key={r.commonCode} className="rounded-lg border border-zinc-200 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-zinc-800">
                      {r.commonCode} {r.productName}
                    </p>
                    <span className={`text-sm font-bold ${r.overallStatus === "critical" ? "text-red-600" : r.overallStatus === "diff" ? "text-amber-600" : r.overallStatus === "unavailable" ? "text-zinc-400" : "text-green-600"}`}>
                      {STATUS_LABEL[r.overallStatus]}
                    </span>
                  </div>
                  {r.fields.some((f) => f.hasDiff) && (
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full min-w-[480px] text-xs">
                        <thead>
                          <tr className="text-left text-zinc-500">
                            <th className="py-1 pr-2">項目</th>
                            <th className="py-1 pr-2">基準値</th>
                            {shops.map((s) => (
                              <th key={s.id} className="py-1 pr-2">
                                {s.shopName}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {r.fields
                            .filter((f) => f.hasDiff)
                            .map((f) => (
                              <tr key={f.field}>
                                <td className="py-1 pr-2 text-zinc-500">{f.label}</td>
                                <td className="py-1 pr-2">{f.baseValue}</td>
                                {shops.map((s) => {
                                  const v = f.values.find((val) => val.shopId === s.id);
                                  return (
                                    <td key={s.id} className={`py-1 pr-2 ${v?.status === "diff" ? "font-bold text-red-600" : v?.status === "unavailable" ? "text-zinc-400" : ""}`}>
                                      {v?.value ?? "-"}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ToolSection>

          <ToolSection step="5" title="CSV出力">
            <button type="button" onClick={handleExportCsv} className="self-start rounded-full bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700">
              差異一覧CSVを出力
            </button>
          </ToolSection>

          <p className="text-xs text-zinc-400">
            レビュー件数・レビュー評価は店舗ごとに異なるのが通常のため、設定差異の対象外としています。商品別ポイント倍率は終了まで24時間以内の施策がAPI仕様上表示されないため、差異なしと表示されても実際の条件が完全一致しているとは限りません。本ツールは検出のみを行い、楽天側の商品設定を自動更新することはありません。
          </p>
        </>
      )}
    </main>
  );
}
