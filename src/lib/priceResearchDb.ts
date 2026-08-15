import { openDB, DBSchema, IDBPDatabase } from "idb";

export interface SearchCondition {
  searchKey: string;
  keyword: string;
  genreId: string;
  minPrice: number | null;
  maxPrice: number | null;
  requestedCount: number;
  createdAt: string;
  lastSearchedAt: string;
}

export interface ProductRecord {
  itemCode: string;
  itemName: string;
  shopCode: string;
  shopName: string;
  itemUrl: string;
  lastSeenAt: string;
}

export interface PriceSnapshot {
  id?: number;
  checkedAt: string;
  searchKey: string;
  itemCode: string;
  itemPrice: number;
  reviewCount: number;
  reviewAverage: number;
  postageFlag: number;
  pointRate: number;
  apiPosition: number;
}

export interface MarketSnapshot {
  id?: number;
  checkedAt: string;
  searchKey: string;
  itemCount: number;
  minPrice: number;
  maxPrice: number;
  averagePrice: number;
  medianPrice: number;
  q1: number;
  q3: number;
  reviewMedian: number;
  freeShippingRate: number;
  pointUpRate: number;
}

interface PriceResearchDBSchema extends DBSchema {
  search_conditions: { key: string; value: SearchCondition };
  products: { key: string; value: ProductRecord };
  price_snapshots: { key: number; value: PriceSnapshot; indexes: { searchKey: string } };
  market_snapshots: { key: number; value: MarketSnapshot; indexes: { searchKey: string } };
}

const DB_NAME = "rakuten-price-research";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<PriceResearchDBSchema>> | null = null;

function getDb() {
  if (typeof indexedDB === "undefined") {
    throw new Error("このブラウザはIndexedDBに対応していません");
  }
  if (!dbPromise) {
    dbPromise = openDB<PriceResearchDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("search_conditions")) {
          db.createObjectStore("search_conditions", { keyPath: "searchKey" });
        }
        if (!db.objectStoreNames.contains("products")) {
          db.createObjectStore("products", { keyPath: "itemCode" });
        }
        if (!db.objectStoreNames.contains("price_snapshots")) {
          const store = db.createObjectStore("price_snapshots", { keyPath: "id", autoIncrement: true });
          store.createIndex("searchKey", "searchKey");
        }
        if (!db.objectStoreNames.contains("market_snapshots")) {
          const store = db.createObjectStore("market_snapshots", { keyPath: "id", autoIncrement: true });
          store.createIndex("searchKey", "searchKey");
        }
      },
    });
  }
  return dbPromise;
}

/** キーワード＋主要検索条件から検索キーを生成する（同一条件の前回比較に使用）。 */
export function buildSearchKey(params: { keyword: string; genreId: string; minPrice: number | null; maxPrice: number | null }): string {
  return [params.keyword.trim(), params.genreId.trim(), params.minPrice ?? "", params.maxPrice ?? ""].join("|");
}

export async function upsertSearchCondition(input: Omit<SearchCondition, "createdAt" | "lastSearchedAt">): Promise<void> {
  const db = await getDb();
  const existing = await db.get("search_conditions", input.searchKey);
  const now = new Date().toISOString();
  await db.put("search_conditions", {
    ...input,
    createdAt: existing?.createdAt ?? now,
    lastSearchedAt: now,
  });
}

export async function listSearchConditions(): Promise<SearchCondition[]> {
  const db = await getDb();
  const all = await db.getAll("search_conditions");
  return all.sort((a, b) => b.lastSearchedAt.localeCompare(a.lastSearchedAt));
}

export async function upsertProducts(products: ProductRecord[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("products", "readwrite");
  await Promise.all(products.map((p) => tx.store.put(p)));
  await tx.done;
}

export async function getProductsByItemCodes(itemCodes: string[]): Promise<Map<string, ProductRecord>> {
  const db = await getDb();
  const results = await Promise.all(itemCodes.map((code) => db.get("products", code)));
  const map = new Map<string, ProductRecord>();
  results.forEach((record, i) => {
    if (record) map.set(itemCodes[i], record);
  });
  return map;
}

/** 指定searchKeyについて、itemCodeごとに直近1件だけを残したマップを返す（前回値比較用）。 */
export async function getLatestPriceSnapshotsByItem(searchKey: string): Promise<Map<string, PriceSnapshot>> {
  const db = await getDb();
  const all = await db.getAllFromIndex("price_snapshots", "searchKey", searchKey);
  const latest = new Map<string, PriceSnapshot>();
  for (const snap of all) {
    const current = latest.get(snap.itemCode);
    if (!current || snap.checkedAt > current.checkedAt) latest.set(snap.itemCode, snap);
  }
  return latest;
}

export async function savePriceSnapshots(snapshots: Omit<PriceSnapshot, "id">[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("price_snapshots", "readwrite");
  await Promise.all(snapshots.map((s) => tx.store.add(s as PriceSnapshot)));
  await tx.done;
}

export async function saveMarketSnapshot(snapshot: Omit<MarketSnapshot, "id">): Promise<void> {
  const db = await getDb();
  await db.add("market_snapshots", snapshot as MarketSnapshot);
}

export async function getMarketSnapshotHistory(searchKey: string): Promise<MarketSnapshot[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex("market_snapshots", "searchKey", searchKey);
  return all.sort((a, b) => a.checkedAt.localeCompare(b.checkedAt));
}

export interface StorageUsage {
  usageBytes: number | null;
  quotaBytes: number | null;
  usageRatio: number | null;
}

export async function estimateStorageUsage(): Promise<StorageUsage> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return { usageBytes: null, quotaBytes: null, usageRatio: null };
  }
  const { usage, quota } = await navigator.storage.estimate();
  return {
    usageBytes: usage ?? null,
    quotaBytes: quota ?? null,
    usageRatio: usage !== undefined && quota ? usage / quota : null,
  };
}

export interface DataCounts {
  searchConditions: number;
  products: number;
  priceSnapshots: number;
  marketSnapshots: number;
}

export async function getDataCounts(): Promise<DataCounts> {
  const db = await getDb();
  const [searchConditions, products, priceSnapshots, marketSnapshots] = await Promise.all([
    db.count("search_conditions"),
    db.count("products"),
    db.count("price_snapshots"),
    db.count("market_snapshots"),
  ]);
  return { searchConditions, products, priceSnapshots, marketSnapshots };
}

export async function deleteSearchData(searchKey: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["search_conditions", "price_snapshots", "market_snapshots"], "readwrite");
  await tx.objectStore("search_conditions").delete(searchKey);
  for (const storeName of ["price_snapshots", "market_snapshots"] as const) {
    const index = tx.objectStore(storeName).index("searchKey");
    let cursor = await index.openCursor(IDBKeyRange.only(searchKey));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
  }
  await tx.done;
}

export async function deleteAllData(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["search_conditions", "products", "price_snapshots", "market_snapshots"], "readwrite");
  await Promise.all([
    tx.objectStore("search_conditions").clear(),
    tx.objectStore("products").clear(),
    tx.objectStore("price_snapshots").clear(),
    tx.objectStore("market_snapshots").clear(),
  ]);
  await tx.done;
}
