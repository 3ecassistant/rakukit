import { RakutenRawItem } from "./rakutenIchibaApi";
import { DiffEvent } from "./priceWatchAnalysis";

export interface WatchTarget {
  id: string;
  shopCode: string;
  label: string;
}

export interface ItemRecord {
  itemCode: string;
  itemName: string;
  itemPrice: number;
  availability: number;
  postageFlag: number;
  pointRate: number;
  genreId: string;
  itemUrl: string;
  reviewCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface StoredTargetState {
  itemsByCode: Record<string, ItemRecord>;
  lastCheckedAt: string | null;
}

export interface ChangedItem {
  itemCode: string;
  itemName: string;
  events: DiffEvent[];
}

export interface ChangeDetectionResult {
  newItems: ItemRecord[];
  missingItems: ItemRecord[];
  changedItems: ChangedItem[];
  continuedCount: number;
  totalCurrentCount: number;
  isComplete: boolean;
}

function toRecord(raw: RakutenRawItem, now: string, firstSeenAt: string): ItemRecord {
  return {
    itemCode: raw.itemCode,
    itemName: raw.itemName,
    itemPrice: raw.itemPrice,
    availability: raw.availability ?? 1,
    postageFlag: raw.postageFlag ?? 1,
    pointRate: raw.pointRate ?? 1,
    genreId: raw.genreId ?? "",
    itemUrl: raw.itemUrl,
    reviewCount: raw.reviewCount ?? 0,
    firstSeenAt,
    lastSeenAt: now,
  };
}

function diffItemRecord(prev: ItemRecord, current: ItemRecord): DiffEvent[] {
  const events: DiffEvent[] = [];
  if (prev.itemPrice !== current.itemPrice) {
    const diff = current.itemPrice - prev.itemPrice;
    const rate = prev.itemPrice === 0 ? 0 : (diff / prev.itemPrice) * 100;
    events.push({
      type: "price",
      label: "価格変更",
      detail: `${prev.itemPrice.toLocaleString()}円 → ${current.itemPrice.toLocaleString()}円（${rate >= 0 ? "+" : ""}${rate.toFixed(1)}%）`,
      severity: Math.abs(rate) >= 20 ? 5 : Math.abs(rate) >= 10 ? 4 : 3,
    });
  }
  if (prev.itemName !== current.itemName) {
    events.push({ type: "name", label: "商品名変更", detail: `${prev.itemName} → ${current.itemName}`, severity: 4 });
  }
  if (prev.availability !== current.availability) {
    events.push({
      type: "availability",
      label: current.availability === 0 ? "販売可否変更（購入不可）" : "販売可否変更（購入可能）",
      detail: `${prev.availability === 1 ? "購入可能" : "購入不可"} → ${current.availability === 1 ? "購入可能" : "購入不可"}`,
      severity: 5,
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
  if (prev.pointRate !== current.pointRate) {
    events.push({ type: "point", label: "商品別ポイント変更", detail: `${prev.pointRate}倍 → ${current.pointRate}倍`, severity: 2 });
  }
  return events;
}

export function detectChanges(
  prevState: StoredTargetState | null,
  currentRawItems: RakutenRawItem[],
  marketTotalCount: number
): { newState: StoredTargetState; result: ChangeDetectionResult } {
  const now = new Date().toISOString();
  const prevItems = prevState?.itemsByCode ?? {};
  const currentCodes = new Set(currentRawItems.map((i) => i.itemCode));

  const newItems: ItemRecord[] = [];
  const changedItems: ChangedItem[] = [];
  const nextItemsByCode: Record<string, ItemRecord> = {};
  let continuedCount = 0;

  for (const raw of currentRawItems) {
    const prevRecord = prevItems[raw.itemCode];
    if (!prevRecord) {
      const record = toRecord(raw, now, now);
      nextItemsByCode[raw.itemCode] = record;
      newItems.push(record);
    } else {
      const record = toRecord(raw, now, prevRecord.firstSeenAt);
      nextItemsByCode[raw.itemCode] = record;
      continuedCount += 1;
      const events = diffItemRecord(prevRecord, record);
      if (events.length > 0) changedItems.push({ itemCode: raw.itemCode, itemName: record.itemName, events });
    }
  }

  const missingItems: ItemRecord[] = Object.values(prevItems).filter((r) => !currentCodes.has(r.itemCode));
  // 今回確認不可の商品も直近の状態を保持し続ける（削除と断定しないため）
  for (const missing of missingItems) {
    if (!nextItemsByCode[missing.itemCode]) nextItemsByCode[missing.itemCode] = missing;
  }

  return {
    newState: { itemsByCode: nextItemsByCode, lastCheckedAt: now },
    result: {
      newItems,
      missingItems,
      changedItems,
      continuedCount,
      totalCurrentCount: currentRawItems.length,
      isComplete: currentRawItems.length >= marketTotalCount,
    },
  };
}
