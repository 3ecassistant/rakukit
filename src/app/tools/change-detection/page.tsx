"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import RelatedAnalysisLinks from "@/components/tools/RelatedAnalysisLinks";
import { buildCsvBlob } from "@/lib/csv";
import { triggerBlobDownload } from "@/lib/download";
import { ChangeDetectionResult, StoredTargetState, WatchTarget, detectChanges } from "@/lib/changeDetection";
import { RakutenRawItem } from "@/lib/rakutenIchibaApi";

const TARGETS_KEY = "rakukit.changeDetection.targets";
const STATE_KEY_PREFIX = "rakukit.changeDetection.state.";

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

function ChangeDetectionContent() {
  const searchParams = useSearchParams();
  const [targets, setTargets] = useState<WatchTarget[]>(() => loadFromStorage<WatchTarget[]>(TARGETS_KEY, []));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
  const [result, setResult] = useState<ChangeDetectionResult | null>(null);
  const [resultShopCode, setResultShopCode] = useState<string | null>(null);
  const autoRanRef = useRef(false);

  useEffect(() => {
    window.localStorage.setItem(TARGETS_KEY, JSON.stringify(targets));
  }, [targets]);

  const addTarget = () => setTargets((prev) => [...prev, { id: uid(), shopCode: "", label: "" }]);
  const updateTarget = (id: string, patch: Partial<WatchTarget>) => setTargets((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const removeTarget = (id: string) => {
    const target = targets.find((t) => t.id === id);
    setTargets((prev) => prev.filter((t) => t.id !== id));
    if (target) window.localStorage.removeItem(STATE_KEY_PREFIX + target.shopCode);
  };

  const handleCheck = async (target: WatchTarget) => {
    if (!target.shopCode.trim()) {
      setError("shopCodeを入力してください");
      return;
    }
    setLoading(true);
    setError(null);
    setActiveTargetId(target.id);
    try {
      const res = await fetch("/api/change-detection-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopInput: target.shopCode.trim(), requestedCount: 300 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? `検索に失敗しました（HTTP ${res.status}）`);
        setResult(null);
        return;
      }
      const stateKey = STATE_KEY_PREFIX + data.shopCode;
      const prevState = loadFromStorage<StoredTargetState | null>(stateKey, null);
      const { newState, result: diffResult } = detectChanges(prevState, data.items as RakutenRawItem[], data.marketTotalCount as number);
      window.localStorage.setItem(stateKey, JSON.stringify(newState));
      setResult(diffResult);
      setResultShopCode(data.shopCode as string);
    } catch {
      setError("通信エラーが発生しました。しばらく待って再度お試しください");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (!result) return;
    const rows: string[][] = [["区分", "商品コード", "商品名", "価格", "詳細"]];
    for (const item of result.newItems) rows.push(["新規検出", item.itemCode, item.itemName, String(item.itemPrice), ""]);
    for (const item of result.missingItems) rows.push(["今回確認不可", item.itemCode, item.itemName, String(item.itemPrice), `前回確認: ${item.lastSeenAt}`]);
    for (const item of result.changedItems) rows.push(["変更あり", item.itemCode, item.itemName, "", item.events.map((e) => `${e.label}: ${e.detail}`).join(" / ")]);
    triggerBlobDownload(buildCsvBlob(rows), "change-detection.csv");
  };

  useEffect(() => {
    const shopCodeParam = searchParams.get("shopCode");
    if (!shopCodeParam) return;
    const timer = setTimeout(() => {
      if (autoRanRef.current) return;
      autoRanRef.current = true;
      const existing = targets.find((t) => t.shopCode === shopCodeParam);
      const target = existing ?? { id: uid(), shopCode: shopCodeParam, label: shopCodeParam };
      if (!existing) setTargets((prev) => [...prev, target]);
      handleCheck(target);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">楽天市場 新商品・競合商品変化検知ツール</h1>
        <p className="text-sm text-zinc-500">
          競合ショップの商品集合を取得し、前回チェック時から「新規検出商品」「今回確認不可の商品」「価格・商品名・販売可否等の変更」を検出します。定期自動監視ではなく、このページで「チェック実行」を押すたびに1回分の比較を行うオンデマンド方式です。履歴はこのブラウザ内にのみ保存されます。
        </p>
      </header>

      <ToolSection step="1" title="監視ショップ登録">
        <div className="flex flex-col gap-2">
          {targets.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-2">
              <input type="text" value={t.shopCode} onChange={(e) => updateTarget(t.id, { shopCode: e.target.value })} placeholder="shopCode または ショップURL" className="w-56 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
              <input type="text" value={t.label} onChange={(e) => updateTarget(t.id, { label: e.target.value })} placeholder="ラベル（任意）" className="w-40 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
              <button type="button" onClick={() => handleCheck(t)} disabled={loading} className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">
                {loading && activeTargetId === t.id ? "チェック中..." : "チェック実行"}
              </button>
              <button type="button" onClick={() => removeTarget(t.id)} className="text-xs text-red-600 hover:underline">
                削除
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addTarget} className="self-start rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-medium text-zinc-600 hover:border-red-400">
          + 監視ショップを追加
        </button>
      </ToolSection>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <>
          <ToolSection step="2" title="本日の変化">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="取得商品数" value={`${result.totalCurrentCount}商品`} />
              <StatTile label="新規検出" value={`${result.newItems.length}商品`} />
              <StatTile label="今回確認不可" value={`${result.missingItems.length}商品`} />
              <StatTile label="変更あり" value={`${result.changedItems.length}商品`} />
            </div>
            {!result.isComplete && (
              <p className="text-xs text-amber-600">⚠ 検索結果の全件を取得できていないため「部分監視」です。今回確認不可の商品は取得上限外の可能性があります。</p>
            )}
          </ToolSection>

          {result.newItems.length > 0 && (
            <ToolSection step="3" title="新規検出商品">
              <ul className="flex flex-col gap-1.5 text-sm">
                {result.newItems.slice(0, 30).map((item) => (
                  <li key={item.itemCode} className="flex items-center justify-between border-b border-zinc-100 pb-1.5">
                    <a href={item.itemUrl} target="_blank" rel="noopener noreferrer" className="truncate text-red-700 hover:underline">
                      {item.itemName}
                    </a>
                    <span className="shrink-0 text-xs text-zinc-500">¥{item.itemPrice.toLocaleString()} / レビュー{item.reviewCount}件</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-zinc-400">「新規検出」は今回のチェックで初めて確認された商品であり、正式な新商品発売日を示すものではありません。</p>
            </ToolSection>
          )}

          {result.changedItems.length > 0 && (
            <ToolSection step="4" title="変更商品">
              <div className="flex flex-col gap-2">
                {result.changedItems.slice(0, 30).map((item) => (
                  <div key={item.itemCode} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-sm">
                    <p className="font-medium text-zinc-800">{item.itemName}</p>
                    <ul className="mt-1 flex flex-col gap-0.5 text-xs text-amber-700">
                      {item.events.map((e, i) => (
                        <li key={i}>
                          【{e.label}】{e.detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </ToolSection>
          )}

          {result.missingItems.length > 0 && (
            <ToolSection step="5" title="今回確認不可の商品">
              <ul className="flex flex-col gap-1 text-sm text-zinc-600">
                {result.missingItems.slice(0, 30).map((item) => (
                  <li key={item.itemCode}>{item.itemName}</li>
                ))}
              </ul>
              <p className="text-xs text-zinc-400">掲載終了・在庫切れ・検索条件変化など複数の可能性があり、削除商品と断定していません。</p>
            </ToolSection>
          )}

          <ToolSection step="6" title="CSV出力">
            <button type="button" onClick={handleExportCsv} className="self-start rounded-full bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700">
              変化検知結果CSVを出力
            </button>
          </ToolSection>

          {resultShopCode && <RelatedAnalysisLinks type="shop" value={resultShopCode} currentSlug="change-detection" />}
        </>
      )}
    </main>
  );
}

export default function ChangeDetectionPage() {
  return (
    <Suspense fallback={null}>
      <ChangeDetectionContent />
    </Suspense>
  );
}
