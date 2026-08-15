export type RppFieldKey =
  | "productKey"
  | "productName"
  | "impressions"
  | "clicks"
  | "adCost"
  | "sales"
  | "orders";

export interface RppColumnMasterEntry {
  key: RppFieldKey;
  label: string;
  aliases: string[];
  required: boolean;
}

// RPPレポートの列名は楽天側の仕様変更・レポート種別により変動しうるため、
// コードへ固定せずマスターとして管理し、自動認識に失敗した場合は手動マッピングできるようにする。
export const RPP_COLUMN_MASTER: RppColumnMasterEntry[] = [
  {
    key: "productKey",
    label: "商品識別情報（商品管理番号など）",
    aliases: ["商品管理番号", "商品コード", "商品番号", "item_id", "商品ID"],
    required: true,
  },
  { key: "productName", label: "商品名", aliases: ["商品名", "item_name"], required: true },
  {
    key: "impressions",
    label: "表示回数",
    aliases: ["表示回数", "インプレッション数", "imp数", "インプレッション"],
    required: true,
  },
  { key: "clicks", label: "クリック数", aliases: ["クリック数", "クリック"], required: true },
  {
    key: "adCost",
    label: "広告費",
    aliases: ["広告費", "実績広告費", "費用", "広告費用"],
    required: true,
  },
  {
    key: "sales",
    label: "売上",
    aliases: ["売上", "広告経由売上", "売上金額", "広告経由売上金額"],
    required: true,
  },
  {
    key: "orders",
    label: "注文件数",
    aliases: ["注文件数", "注文数", "受注件数", "注文件数（広告経由）"],
    required: true,
  },
];

export function autoRecognizeColumns(header: string[]): Partial<Record<RppFieldKey, number>> {
  const mapping: Partial<Record<RppFieldKey, number>> = {};
  RPP_COLUMN_MASTER.forEach((entry) => {
    const idx = header.findIndex((h) => entry.aliases.includes(h.trim()));
    if (idx >= 0) mapping[entry.key] = idx;
  });
  return mapping;
}
