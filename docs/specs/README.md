# RakuKit 仕様書一覧

各ツールの詳細仕様書（原文）と、実装した画面の対応表。

| # | 仕様書 | 実装先 |
|---|---|---|
| 01 | [画像リサイズ・圧縮ツール](01-image-tool.md) | [/tools/image](../../src/app/tools/image) |
| 02 | [商品テキスト／HTML／CSVツール群（11機能）](02-text-html-csv-tools.md) | `/tools/product-name`, `/tools/zenkaku-hankaku`, `/tools/forbidden-chars`, `/tools/html-format`, `/tools/html-strip`, `/tools/csv-encoding`, `/tools/csv-extract`, `/tools/csv-dedupe`, `/tools/csv-replace`, `/tools/csv-excel` |
| 03 | [サジェストキーワード収集ツール](03-suggest-collector.md) | [/tools/suggest](../../src/app/tools/suggest) |
| 04 | [サジェスト差分・トレンド分析ツール](04-suggest-trend.md) | [/tools/suggest-trend](../../src/app/tools/suggest-trend) |
| 05 | [商品名SEOチェッカー](05-product-seo-checker.md) | [/tools/product-seo-check](../../src/app/tools/product-seo-check) |
| 06 | [CSV商品一括編集ツール](06-csv-bulk-edit.md) | [/tools/csv-bulk-edit](../../src/app/tools/csv-bulk-edit) |
| 07 | [RPP広告分析ツール](07-rpp-analysis.md) | [/tools/rpp-analysis](../../src/app/tools/rpp-analysis) |
| 08 | [利益・値引きシミュレーター](08-profit-simulator.md) | [/tools/profit-simulator](../../src/app/tools/profit-simulator) |
| 09 | [商品名一括SEO診断ツール](09-bulk-seo-check.md) | [/tools/bulk-seo-check](../../src/app/tools/bulk-seo-check) |
| 10 | [ポイント vs クーポン比較ツール](10-promotion-comparator.md) | [/tools/promotion-comparator](../../src/app/tools/promotion-comparator) |
| 11 | [値引き必要販売数シミュレーター](11-discount-volume-simulator.md) | [/tools/discount-volume](../../src/app/tools/discount-volume) |
| 12 | [値上げ許容販売減少率シミュレーター](12-price-increase-volume-simulator.md) | [/tools/price-increase](../../src/app/tools/price-increase) |
| 13 | [クーポン最低購入金額シミュレーター](13-coupon-minimum-spend-simulator.md) | [/tools/coupon-minimum-spend](../../src/app/tools/coupon-minimum-spend) |
| 14 | [最大ポイント倍率チェッカー](14-max-point-rate-checker.md) | [/tools/max-point-rate](../../src/app/tools/max-point-rate) |
| 15 | [まとめ買いクーポン採算チェッカー](15-bulk-purchase-coupon-checker.md) | [/tools/bulk-purchase-coupon](../../src/app/tools/bulk-purchase-coupon) |
| 16 | [送料無料化必要販売増加率シミュレーター](16-free-shipping-volume-simulator.md) | [/tools/free-shipping-volume](../../src/app/tools/free-shipping-volume) |
| 17 | [RPP必要CVRシミュレーター](17-rpp-required-cvr-simulator.md) | [/tools/rpp-required-cvr](../../src/app/tools/rpp-required-cvr) |
| 18 | [CVR別CPC上限マトリクス](18-cpc-limit-matrix.md) | [/tools/cpc-limit-matrix](../../src/app/tools/cpc-limit-matrix) |
| 19 | [RPP赤字まであと何クリックシミュレーター](19-rpp-click-runway.md) | [/tools/rpp-click-runway](../../src/app/tools/rpp-click-runway) |
| 20 | [広告予算増額シミュレーター](20-ad-budget-scaling-simulator.md) | [/tools/ad-budget-scaling](../../src/app/tools/ad-budget-scaling) |
| 21 | [売上目標逆算シミュレーター](21-sales-target-reverse-simulator.md) | [/tools/sales-target-reverse](../../src/app/tools/sales-target-reverse) |
| 22 | [SALE目標売上・必要販売数シミュレーター](22-sale-target-simulator.md) | [/tools/sale-target](../../src/app/tools/sale-target) |
| 23 | [クーポン予算・必要売上シミュレーター](23-coupon-budget-simulator.md) | [/tools/coupon-budget](../../src/app/tools/coupon-budget) |
| 24 | [在庫消化に必要な販売数・価格シミュレーター](24-inventory-clearance-simulator.md) | [/tools/inventory-clearance](../../src/app/tools/inventory-clearance) |
| 25 | [在庫消化値下げ上限・利益許容額シミュレーター](25-inventory-markdown-limit-simulator.md) | [/tools/inventory-markdown-limit](../../src/app/tools/inventory-markdown-limit) |
| 26 | [客単価目標・必要まとめ買い率シミュレーター](26-bulk-purchase-rate-simulator.md) | [/tools/bulk-purchase-rate](../../src/app/tools/bulk-purchase-rate) |
| 27 | [送料無料ライン目標・必要客単価シミュレーター](27-free-shipping-threshold-aov-simulator.md) | [/tools/free-shipping-threshold-aov](../../src/app/tools/free-shipping-threshold-aov) |
| 28 | [売上目標達成・必要新規顧客数シミュレーター](28-new-customer-target-simulator.md) | [/tools/new-customer-target](../../src/app/tools/new-customer-target) |
| 29 | [レビュー評価目標・必要★5件数シミュレーター](29-review-rating-target-simulator.md) | [/tools/review-rating-target](../../src/app/tools/review-rating-target) |
| 30 | [低評価レビュー1件の影響・回復必要件数シミュレーター](30-low-rating-impact-simulator.md) | [/tools/low-rating-impact](../../src/app/tools/low-rating-impact) |
| 31 | [リピート率目標・必要リピーター数シミュレーター](31-repeat-rate-target-simulator.md) | [/tools/repeat-rate-target](../../src/app/tools/repeat-rate-target) |
| 32 | [リピート売上目標・必要再購入件数シミュレーター](32-repeat-sales-target-simulator.md) | [/tools/repeat-sales-target](../../src/app/tools/repeat-sales-target) |
| 33 | [月間利益目標・必要売上／販売数シミュレーター](33-profit-target-simulator.md) | [/tools/profit-target](../../src/app/tools/profit-target) |
| 34 | [固定費回収・必要販売数シミュレーター](34-fixed-cost-break-even-simulator.md) | [/tools/fixed-cost-break-even](../../src/app/tools/fixed-cost-break-even) |
| 35 | [楽天市場 競合商品分析ツール](35-competitor-analysis-tool.md) | [/tools/competitor-analysis](../../src/app/tools/competitor-analysis) |
| 36 | [楽天SEO競合タイトル分析ツール](36-title-seo-analysis-tool.md) | [/tools/title-seo-analysis](../../src/app/tools/title-seo-analysis) |
| 37 | [楽天SEOキーワード競合度チェッカー](37-keyword-competition-checker.md) | [/tools/keyword-competition-checker](../../src/app/tools/keyword-competition-checker) |
| 38 | [楽天市場 価格ポジショニング分析ツール](38-price-position-analysis-tool.md) | [/tools/price-position-analysis](../../src/app/tools/price-position-analysis) |
| 39 | [楽天市場 レビュー参入障壁分析ツール](39-review-barrier-analysis-tool.md) | [/tools/review-barrier-analysis](../../src/app/tools/review-barrier-analysis) |
| 40 | [楽天市場 ポイント・送料無料競争分析ツール](40-promotion-competition-analysis-tool.md) | [/tools/promotion-competition-analysis](../../src/app/tools/promotion-competition-analysis) |
| 41 | [楽天市場 競合ショップ商品構成分析ツール](41-shop-composition-analysis-tool.md) | [/tools/shop-composition-analysis](../../src/app/tools/shop-composition-analysis) |
| 42 | [楽天市場 13店舗 商品設定差異チェックツール](42-shop-diff-checker-tool.md) | [/tools/shop-diff-checker](../../src/app/tools/shop-diff-checker) |
| 43 | [楽天市場 商品属性×競争力分析ツール](43-attribute-competition-analysis-tool.md) | [/tools/attribute-competition-analysis](../../src/app/tools/attribute-competition-analysis) |
| 44 | [楽天市場 空白市場発見ツール](44-market-gap-finder-tool.md) | [/tools/market-gap-finder](../../src/app/tools/market-gap-finder) |
| 45 | [楽天市場 タイムセール・価格監視ツール](45-price-watch-tool.md) | [/tools/price-watch](../../src/app/tools/price-watch)（オンデマンド差分方式・自動定期監視ではない） |
| 46 | [楽天市場 新商品・競合商品変化検知ツール](46-change-detection-tool.md) | [/tools/change-detection](../../src/app/tools/change-detection)（オンデマンド差分方式・自動定期監視ではない） |
| 47 | [楽天市場 価格調査ツール](47-price-research-tool.md) | [/tools/price-research](../../src/app/tools/price-research)（価格履歴はサーバーに保存せず、ブラウザ内IndexedDBに保存） |

## 注記

- 各仕様書はユーザーから提示された原文をそのまま保存している（要約・改変なし）。
- 実装はいずれも仕様書の **P0（MVP最優先）範囲** を基本とし、P1/P2として明記された機能は意図的に省略している。省略箇所は各ツール実装時の会話ログ、またはコード内コメントを参照。
- 仕様書と実際の実装内容に差異が生じた場合は、コード（`src/`）を正とする。この一覧は仕様の経緯を追うための参照資料。
