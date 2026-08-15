import { RakutenRawItem } from "./rakutenIchibaApi";

export interface WatchItem {
  id: string;
  itemCode: string;
  label: string;
  category: string;
}

export interface Snapshot {
  checkedAt: string;
  itemName: string;
  itemPrice: number;
  availability: number;
  postageFlag: number;
  startTime: string;
  endTime: string;
  pointRate: number;
  pointRateStartTime: string;
  pointRateEndTime: string;
}

export interface DiffEvent {
  type: "price" | "sale" | "point" | "postage" | "availability" | "name";
  label: string;
  detail: string;
  severity: 1 | 2 | 3 | 4 | 5;
}

export function buildSnapshot(raw: RakutenRawItem): Snapshot {
  return {
    checkedAt: new Date().toISOString(),
    itemName: raw.itemName,
    itemPrice: raw.itemPrice,
    availability: raw.availability ?? 1,
    postageFlag: raw.postageFlag ?? 1,
    startTime: raw.startTime ?? "",
    endTime: raw.endTime ?? "",
    pointRate: raw.pointRate ?? 1,
    pointRateStartTime: raw.pointRateStartTime ?? "",
    pointRateEndTime: raw.pointRateEndTime ?? "",
  };
}

function priceChangeSeverity(changeRate: number): 1 | 2 | 3 | 4 | 5 {
  const abs = Math.abs(changeRate);
  if (abs >= 20) return 5;
  if (abs >= 10) return 4;
  if (abs >= 5) return 3;
  if (abs > 0) return 2;
  return 1;
}

export function diffSnapshots(prev: Snapshot | null, current: Snapshot): DiffEvent[] {
  if (!prev) return [];
  const events: DiffEvent[] = [];

  if (prev.itemPrice !== current.itemPrice) {
    const diff = current.itemPrice - prev.itemPrice;
    const rate = prev.itemPrice === 0 ? 0 : (diff / prev.itemPrice) * 100;
    events.push({
      type: "price",
      label: diff < 0 ? "値下げ検出" : "値上げ検出",
      detail: `${prev.itemPrice.toLocaleString()}円 → ${current.itemPrice.toLocaleString()}円（${diff >= 0 ? "+" : ""}${diff.toLocaleString()}円 / ${rate >= 0 ? "+" : ""}${rate.toFixed(1)}%）`,
      severity: priceChangeSeverity(rate),
    });
  }

  const prevHasSale = Boolean(prev.startTime);
  const currentHasSale = Boolean(current.startTime);
  if (!prevHasSale && currentHasSale) {
    events.push({ type: "sale", label: "SALE設定検出", detail: `${current.startTime} 〜 ${current.endTime}`, severity: 4 });
  } else if (prevHasSale && !currentHasSale) {
    events.push({ type: "sale", label: "SALE終了確認", detail: `前回SALE期間: ${prev.startTime} 〜 ${prev.endTime}`, severity: 3 });
  } else if (prevHasSale && currentHasSale && (prev.startTime !== current.startTime || prev.endTime !== current.endTime)) {
    events.push({ type: "sale", label: "SALE期間変更", detail: `${prev.startTime}〜${prev.endTime} → ${current.startTime}〜${current.endTime}`, severity: 3 });
  }

  if (prev.pointRate !== current.pointRate) {
    events.push({
      type: "point",
      label: current.pointRate > prev.pointRate ? "商品別ポイントUP検出" : "商品別ポイント倍率低下",
      detail: `${prev.pointRate}倍 → ${current.pointRate}倍`,
      severity: current.pointRate >= 10 ? 4 : current.pointRate >= 5 ? 3 : 2,
    });
  }

  if (prev.postageFlag !== current.postageFlag) {
    events.push({
      type: "postage",
      label: "送料条件変更",
      detail: `${prev.postageFlag === 0 ? "送料込み" : "送料別"} → ${current.postageFlag === 0 ? "送料込み" : "送料別"}`,
      severity: 3,
    });
  }

  if (prev.availability !== current.availability) {
    events.push({
      type: "availability",
      label: current.availability === 0 ? "販売停止・売切状態検出" : "販売再開確認",
      detail: current.availability === 0 ? "購入可能 → 購入不可" : "購入不可 → 購入可能",
      severity: 5,
    });
  }

  if (prev.itemName !== current.itemName) {
    events.push({ type: "name", label: "商品名変更", detail: `${prev.itemName} → ${current.itemName}`, severity: 4 });
  }

  return events;
}

export interface HistorySummary {
  current: number;
  min: number;
  max: number;
  changeCount: number;
  mostCommonPrice: number;
}

export function summarizeHistory(snapshots: Snapshot[]): HistorySummary | null {
  if (snapshots.length === 0) return null;
  const prices = snapshots.map((s) => s.itemPrice);
  const changeCount = snapshots.slice(1).filter((s, i) => s.itemPrice !== snapshots[i].itemPrice).length;
  const freq = new Map<number, number>();
  for (const p of prices) freq.set(p, (freq.get(p) ?? 0) + 1);
  const mostCommonPrice = Array.from(freq.entries()).sort((a, b) => b[1] - a[1])[0][0];
  return {
    current: prices[prices.length - 1],
    min: Math.min(...prices),
    max: Math.max(...prices),
    changeCount,
    mostCommonPrice,
  };
}
