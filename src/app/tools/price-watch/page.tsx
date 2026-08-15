"use client";

import { useEffect, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import { buildCsvBlob } from "@/lib/csv";
import { triggerBlobDownload } from "@/lib/download";
import { DiffEvent, HistorySummary, Snapshot, WatchItem, buildSnapshot, diffSnapshots, summarizeHistory } from "@/lib/priceWatchAnalysis";
import { RakutenRawItem } from "@/lib/rakutenIchibaApi";

const WATCHLIST_KEY = "rakukit.priceWatch.watchlist";
const HISTORY_KEY = "rakukit.priceWatch.history";
const MAX_HISTORY_PER_ITEM = 60;

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

interface RunResult {
  itemCode: string;
  label: string;
  ok: boolean;
  error?: string;
  snapshot?: Snapshot;
  events: DiffEvent[];
  summary: HistorySummary | null;
}

export default function PriceWatchPage() {
  const [watchlist, setWatchlist] = useState<WatchItem[]>(() => loadFromStorage<WatchItem[]>(WATCHLIST_KEY, []));
  const [history, setHistory] = useState<Record<string, Snapshot[]>>(() => loadFromStorage<Record<string, Snapshot[]>>(HISTORY_KEY, {}));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runResults, setRunResults] = useState<RunResult[] | null>(null);

  useEffect(() => {
    window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
  }, [watchlist]);
  useEffect(() => {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  const addWatchItem = () => setWatchlist((prev) => [...prev, { id: uid(), itemCode: "", label: "", category: "" }]);
  const updateWatchItem = (id: string, patch: Partial<WatchItem>) => setWatchlist((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  const removeWatchItem = (id: string) => {
    const target = watchlist.find((w) => w.id === id);
    setWatchlist((prev) => prev.filter((w) => w.id !== id));
    if (target) {
      setHistory((prev) => {
        const next = { ...prev };
        delete next[target.itemCode];
        return next;
      });
    }
  };

  const handleCheckNow = async () => {
    const targets = watchlist.filter((w) => w.itemCode.trim());
    if (targets.length === 0) {
      setError("監視するitemCodeを1件以上登録してください");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/price-watch-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemCodes: targets.map((t) => t.itemCode.trim()) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? `取得に失敗しました（HTTP ${res.status}）`);
        return;
      }
      const results = data.results as Record<string, { ok: true; item: RakutenRawItem } | { ok: false; error: string }>;
      const nextHistory = { ...history };
      const runResultsBuild: RunResult[] = [];

      for (const target of targets) {
        const fetched = results[target.itemCode.trim()];
        if (!fetched || !fetched.ok) {
          runResultsBuild.push({ itemCode: target.itemCode, label: target.label || target.itemCode, ok: false, error: fetched?.error ?? "取得失敗", events: [], summary: null });
          continue;
        }
        const snapshot = buildSnapshot(fetched.item);
        const prevList = nextHistory[target.itemCode] ?? [];
        const prevSnapshot = prevList.length > 0 ? prevList[prevList.length - 1] : null;
        const events = diffSnapshots(prevSnapshot, snapshot);
        const updatedList = [...prevList, snapshot].slice(-MAX_HISTORY_PER_ITEM);
        nextHistory[target.itemCode] = updatedList;
        runResultsBuild.push({ itemCode: target.itemCode, label: target.label || target.itemCode, ok: true, snapshot, events, summary: summarizeHistory(updatedList) });
      }

      setHistory(nextHistory);
      setRunResults(runResultsBuild);
    } catch {
      setError("通信エラーが発生しました。しばらく待って再度お試しください");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (!runResults) return;
    const rows: string[][] = [["取得日時", "itemCode", "ラベル", "現在価格", "監視開始後最安値", "監視開始後最高値", "価格変更回数", "検出イベント"]];
    for (const r of runResults) {
      rows.push([
        r.snapshot?.checkedAt ?? "",
        r.itemCode,
        r.label,
        r.snapshot ? String(r.snapshot.itemPrice) : "-",
        r.summary ? String(r.summary.min) : "-",
        r.summary ? String(r.summary.max) : "-",
        r.summary ? String(r.summary.changeCount) : "-",
        r.events.map((e) => `${e.label}: ${e.detail}`).join(" / "),
      ]);
    }
    triggerBlobDownload(buildCsvBlob(rows), "price-watch.csv");
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">楽天市場 タイムセール・価格監視ツール</h1>
        <p className="text-sm text-zinc-500">
          登録した商品（itemCode）の現在価格・SALE設定・商品別ポイント倍率・送料・販売可否を取得し、前回チェック時からの変化を検出します。定期自動監視ではなく、このページを開いて「現在の状態を取得」を押すたびに1回分のチェックを行うオンデマンド方式です。履歴はこのブラウザ内にのみ保存されます。
        </p>
      </header>

      <ToolSection step="1" title="監視商品登録">
        <div className="flex flex-col gap-2">
          {watchlist.map((w) => (
            <div key={w.id} className="flex flex-wrap items-center gap-2">
              <input type="text" value={w.itemCode} onChange={(e) => updateWatchItem(w.id, { itemCode: e.target.value })} placeholder="itemCode（例：shop-a:12345）" className="w-52 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
              <input type="text" value={w.label} onChange={(e) => updateWatchItem(w.id, { label: e.target.value })} placeholder="ラベル（任意）" className="w-40 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
              <input type="text" value={w.category} onChange={(e) => updateWatchItem(w.id, { category: e.target.value })} placeholder="カテゴリ（任意）" className="w-32 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
              <button type="button" onClick={() => removeWatchItem(w.id)} className="text-xs text-red-600 hover:underline">
                削除
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addWatchItem} className="self-start rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-medium text-zinc-600 hover:border-red-400">
          + 監視商品を追加
        </button>
        <button type="button" onClick={handleCheckNow} disabled={loading} className="self-start rounded-full bg-red-600 px-6 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
          {loading ? "取得中..." : "現在の状態を取得"}
        </button>
      </ToolSection>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      {runResults && (
        <>
          <ToolSection step="2" title="本日の変化">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="チェック商品数" value={`${runResults.length}件`} />
              <StatTile label="価格変更" value={`${runResults.filter((r) => r.events.some((e) => e.type === "price")).length}件`} />
              <StatTile label="SALE変化" value={`${runResults.filter((r) => r.events.some((e) => e.type === "sale")).length}件`} />
              <StatTile label="取得失敗" value={`${runResults.filter((r) => !r.ok).length}件`} />
            </div>
          </ToolSection>

          <ToolSection step="3" title="商品別状況">
            <div className="flex flex-col gap-3">
              {runResults.map((r) => (
                <div key={r.itemCode} className="rounded-lg border border-zinc-200 p-4">
                  <p className="font-bold text-zinc-800">{r.label}</p>
                  {!r.ok ? (
                    <p className="text-sm text-red-600">取得失敗：{r.error}</p>
                  ) : (
                    <>
                      <div className="mt-1 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                        <StatTile label="現在価格" value={`¥${r.snapshot!.itemPrice.toLocaleString()}`} />
                        <StatTile label="監視開始後最安値" value={r.summary ? `¥${r.summary.min.toLocaleString()}` : "-"} />
                        <StatTile label="監視開始後最高値" value={r.summary ? `¥${r.summary.max.toLocaleString()}` : "-"} />
                        <StatTile label="価格変更回数" value={r.summary ? `${r.summary.changeCount}回` : "-"} />
                      </div>
                      {r.events.length > 0 ? (
                        <ul className="mt-2 flex flex-col gap-1 text-sm">
                          {r.events.map((e, i) => (
                            <li key={i} className="text-amber-700">
                              【{e.label}】{e.detail}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-zinc-400">前回チェックからの変化はありません（初回チェックの場合は比較対象がありません）。</p>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </ToolSection>

          <ToolSection step="4" title="CSV出力">
            <button type="button" onClick={handleExportCsv} className="self-start rounded-full bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700">
              チェック結果CSVを出力
            </button>
          </ToolSection>

          <p className="text-xs text-zinc-400">
            価格・SALE履歴はチェックを実行した時点の情報のみで構成されます。チェック頻度が低いと短時間の値下げ・SALEを検知できない場合があります。「通常価格候補」は履歴上最も頻出した価格であり、楽天側の正式な通常価格設定を保証するものではありません。
          </p>
        </>
      )}
    </main>
  );
}
