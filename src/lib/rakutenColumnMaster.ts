export interface ColumnMasterEntry {
  id: string;
  label: string;
  aliases: string[];
  protectedColumn?: boolean;
}

// 楽天RMS商品CSVでよく使われる列名の一部。完全な列名マスターではなく、
// プレビュー時に分かりやすいラベルを添えるための簡易的な認識リストとして扱う。
export const RAKUTEN_COLUMN_MASTER: ColumnMasterEntry[] = [
  { id: "itemManagementId", label: "商品管理番号", aliases: ["商品管理番号"], protectedColumn: true },
  { id: "itemNumber", label: "商品番号", aliases: ["商品番号"], protectedColumn: true },
  { id: "itemName", label: "商品名", aliases: ["商品名"] },
  { id: "catchCopy", label: "キャッチコピー", aliases: ["キャッチコピー", "商品キャッチコピー"] },
  { id: "salesPrice", label: "販売価格", aliases: ["販売価格"] },
  { id: "displayPrice", label: "表示価格", aliases: ["表示価格"] },
  { id: "itemDescriptionPc", label: "PC用商品説明文", aliases: ["PC用商品説明文", "商品説明文（PC）"] },
  { id: "itemDescriptionMobile", label: "スマートフォン用商品説明文", aliases: ["スマートフォン用商品説明文", "スマホ用商品説明文"] },
  { id: "skuManagementId", label: "SKU管理番号", aliases: ["SKU管理番号"] },
  { id: "janCode", label: "JANコード", aliases: ["JANコード", "JAN"] },
  { id: "categoryId", label: "表示先カテゴリ", aliases: ["表示先カテゴリ", "カテゴリID"] },
  { id: "stock", label: "在庫数", aliases: ["在庫数", "在庫数（在庫あり値）"] },
];

export function recognizeColumn(header: string): ColumnMasterEntry | null {
  const trimmed = header.trim();
  return RAKUTEN_COLUMN_MASTER.find((entry) => entry.aliases.includes(trimmed)) ?? null;
}
