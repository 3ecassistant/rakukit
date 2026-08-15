import { Metadata } from "next";
import LegalDocument from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表示",
};

const ROWS: { label: string; value: string }[] = [
  { label: "販売事業者名（運営統括責任者）", value: "石川剛大" },
  {
    label: "所在地",
    value: "ご請求をいただいた場合には、遅滞なく開示いたします。開示のご請求は、お問い合わせフォームよりご連絡ください。",
  },
  {
    label: "電話番号",
    value: "ご請求をいただいた場合には、遅滞なく開示いたします。開示のご請求は、お問い合わせフォームよりご連絡ください。",
  },
  { label: "メールアドレス", value: "3.ecassistant@gmail.com" },
  {
    label: "販売価格",
    value: "PROプラン 月額4,980円（税込）／ 年額49,800円（税込）",
  },
  {
    label: "商品代金以外の必要料金",
    value: "インターネット接続料金・通信料金等はお客様のご負担となります。",
  },
  {
    label: "お支払い方法",
    value: "クレジットカード決済（Stripe, Inc. の提供する決済システムを利用しています）",
  },
  {
    label: "お支払い時期",
    value:
      "月払いプラン: ご契約時に初回課金され、以降は毎月同日に自動課金されます。年払いプラン: ご契約時に初回課金され、以降は年1回同日に自動課金されます。",
  },
  {
    label: "サービス提供時期",
    value: "お支払い手続きの完了後、直ちにPRO機能をご利用いただけます。",
  },
  {
    label: "返品・キャンセルについて",
    value:
      "デジタルサービスの性質上、お支払い済みの料金の返金は原則として行っておりません。解約は次回更新日の前までにお客様ご自身でいつでも行うことができ、解約後も現在の請求期間の終了日まではPRO機能をご利用いただけます。日割りでの返金は行っておりません。",
  },
  {
    label: "動作環境",
    value: "最新版のGoogle Chrome、Microsoft Edge、Safariなど主要なWebブラウザ",
  },
];

export default function TokushohoPage() {
  return (
    <LegalDocument title="特定商取引法に基づく表示" updatedAt="2026年8月15日">
      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full border-collapse text-sm">
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label} className="border-b border-zinc-100 last:border-b-0">
                <th className="w-40 shrink-0 whitespace-nowrap bg-zinc-50 p-3 text-left align-top font-semibold text-zinc-700">
                  {row.label}
                </th>
                <td className="p-3 align-top text-zinc-700">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </LegalDocument>
  );
}
