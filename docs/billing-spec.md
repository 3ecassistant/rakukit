# 楽天店舗運営支援SaaS FREE / PRO課金・サブスクリプション 詳細仕様書

> 2026-08-14 にユーザーから提示された原文をそのまま保存している（要約・改変なし）。
> `docs/specs/` 配下は個別ツールの仕様書なので、この文書はプロダクト全体の収益化・課金アーキテクチャ仕様として `docs/` 直下に置く。

■① 課金設計の基本方針

・①〜㉔まで作成した24ツールを、単純に「有料計算機」として販売しない。

・基本構造は、

FREE
＝その場で答えを出す

PRO
＝自店データを保存し、次回以降の判断を速くする

とする。

・FREEでは一問一答型シミュレーターそのものを積極的に公開する。

・PROでは、

店舗設定保存

商品保存

シナリオ保存

履歴

ツール間データ引継ぎ

CSV

一括処理

比較

月次管理

など「継続利用するほど便利になる機能」を課金対象とする。

・これは当初から定めていた「FREE＝ログイン不要・単発計算」「PRO＝店舗設定・商品保存・複数シナリオ・CSV・履歴・他ツール連携」という方針を、そのまま収益モデルへ変換する設計である。

■② SaaSとして販売するもの

販売するものは、

× 24種類の計算機

ではない。

正しくは、

**「楽天店舗運営の判断を、毎回ゼロから計算しなくてよくする環境」**

とする。

■③ 商品コンセプト

中心コンセプト：

**楽天店舗の「これ、やって大丈夫？」を数字で即判断する。**

対象判断：

・値上げしてよいか

・値下げしてよいか

・クーポンはいくらまで出せるか

・ポイントは何％まで負担できるか

・CPCはいくらまで許容できるか

・CVRはいくら必要か

・広告予算を増やすならROASはいくら必要か

・SALE価格なら何個必要か

・在庫を何個/日売る必要があるか

・レビュー目標まで何件必要か

・リピート率には何人必要か

・利益目標には何個必要か

など。

■④ 無料ツールの役割

FREEは単なる機能制限版ではなく、

**集客装置**

として扱う。

Google検索

↓

無料シミュレーター

↓

即結果

↓

PRO機能への自然な導線

という構造を作る。

■⑤ FREEを強く残す理由

・Google検索流入を取りやすい。

・ユーザー登録前に価値を体験できる。

・「課金しないと答えが分からない」という不信感を避けられる。

・計算結果そのものは共有されやすい。

・各ツールが独立したSEOランディングページになる。

・24ツールすべてがPROへの入口になる。

■⑥ 課金ポイントの原則

**計算結果ではなく、運用効率へ課金する。**

つまり、

× 結果を見るために課金

ではなく、

○ 結果を保存する

○ 商品に紐付ける

○ 次回の入力を省略する

○ 複数案を比較する

○ CSVでまとめて処理する

○ 他ツールへ条件を引き継ぐ

○ 月次履歴を見る

ために課金する。

■⑦ プラン構成

MVPでは2プランのみ。

FREE

PRO

の2段階とする。

■⑧ BUSINESSプランはMVPでは作らない

将来的には、

・複数店舗

・複数ユーザー

・権限管理

・大量CSV

・店舗横断分析

等をBUSINESSへ分ける余地を残す。

ただし初期は、

FREE

PRO

だけに集中する。

■⑨ FREE料金

0円。

■⑩ PRO料金

MVP暫定価格：

**月額4,980円**

とする。

■⑪ 年払い

年間：

**49,800円 / 年**

を基本案とする。

■⑫ 年払いの意味

月額4,980円 ×12か月

=
59,760円

年間49,800円なら、

差額：

9,960円

つまり、

月額2か月分相当を割り引く。

■⑬ 年額の表示方法

表示：

「49,800円 / 年」

「月額換算4,150円」

「月払いより年間9,960円お得」

とする。

■⑭ 年額表示上の注意

× 4,150円/月

だけを大きく表示しない。

実際の請求が年一括なら、

**「49,800円を年1回請求」**

を必ず明記する。

■⑮ 価格はMVP暫定

4,980円は最終固定価格ではない。

初期ユーザーの、

・利用頻度

・CSV利用率

・商品保存数

・継続率

・解約理由

を見て調整可能とする。

■⑯ FREEで利用可能な基本機能

・①〜㉔の基本計算。

・ログイン不要。

・計算回数制限なし。

・基本入力。

・基本結果。

・計算根拠表示。

・結果コピー。

・同一画面内の再計算。

・スマートフォン利用。

・他の無料ツールへの遷移。

■⑰ FREEで制限しないもの

**計算回数そのものは原則制限しない。**

「1日3回まで」

などの回数制限はMVPでは設けない。

■⑱ 理由

軽量計算はブラウザ内TypeScriptで実行する設計であり、AIや外部APIを必要としないため、無料計算回数を人工的に制限するメリットが小さい。既存方針でも軽量計算はブラウザ内TypeScript、AI不要、外部API不要としている。

■⑲ FREEで保存できないもの

・店舗設定。

・商品情報。

・過去計算履歴。

・名前付きシナリオ。

・月次目標。

・CSVデータ。

・商品別KPI履歴。

■⑳ FREEのツール間引継ぎ

同一セッション内の一時的な引継ぎは許可してよい。

例：

⑲
送料無料ライン5,000円

↓

⑱
目標AOV5,000円

へ遷移。

■㉑ FREEで許可する理由

これは「現在行っている計算の続き」であり、PRO価値を大きく毀損しない。

■㉒ PROとの差

FREE：

その場だけ引継ぎ。

PRO：

商品・店舗に紐づけて永続保存し、翌日でも別端末でも利用可能。

■㉓ PRO基本機能

PROでは最低限、

・店舗設定保存。

・商品保存。

・商品条件自動入力。

・シナリオ保存。

・計算履歴。

・複数シナリオ比較。

・ツール間永続データ連携。

・CSV。

・結果エクスポート。

・月次KPI保存。

を提供する。

■㉔ PRO最大の価値

例えばFREEでは毎回、

販売価格

原価

送料

販売関連費率

ポイント負担

最低利益率

を入力する。

PROでは商品を選択するだけで、

これらを自動入力。

ユーザーは、

CPC

SALE価格

クーポン額

など「今回変更したい数値」だけ入力する。

■㉕ PROの中心メッセージ

**「毎回同じ数字を入力する必要がなくなります。」**

これを最重要訴求の1つにする。

■㉖ PRO対象店舗数

MVP：

**1契約＝1店舗**

を基本とする。

■㉗ 商品保存上限

MVP暫定：

1店舗あたり

**1,000商品**

まで。

■㉘ シナリオ保存上限

MVPでは実質十分な上限として、

5,000シナリオ程度まで設計可能。

ただしユーザー画面で積極的に上限訴求しない。

■㉙ 複数店舗

複数店舗利用は将来的なBUSINESS候補。

MVPのDB構造だけは複数店舗対応可能にしておく。

■㉚ テナント設計

サブスクリプションは、

**ユーザー単位ではなくworkspace単位**

で持つことを推奨。

■㉛ workspaceとは

将来の、

店舗

会社

チーム

をまとめる最上位単位。

■㉜ MVP構造

User

↓

Workspace

↓

Store

↓

Products

↓

Scenarios / History

とする。

■㉝ Workspaceを今から入れる理由

後から、

・スタッフ招待。

・複数ユーザー。

・権限。

・複数店舗。

を追加する際にDBを大幅変更しなくて済む。

■㉞ FREEユーザーの扱い

ログインしていないユーザー：

ANONYMOUS_FREE

アカウントはあるが未課金：

ACCOUNT_FREE

PRO：

PRO

という3状態を内部的に持つ。

■㉟ ANONYMOUS_FREE

・24ツール基本計算。

・保存なし。

・ログイン不要。

■㊱ ACCOUNT_FREE

・機能は基本的にANONYMOUS_FREEと同じ。

・アカウントページには入れる。

・PRO契約が可能。

・過去にPROだった場合、保存データの状態確認が可能。

■㊲ PRO

・全PRO権限。

■㊳ ログインを強制するタイミング

無料計算時には強制しない。

■㊴ ログインを求めるタイミング

ユーザーが、

「この商品を保存」

「結果を保存」

「CSVでまとめて計算」

「比較シナリオを保存」

などPRO行動を明示的に選択したタイミング。

■㊵ Paywallの基本思想

結果を隠して課金させない。

**行動を拡張しようとした瞬間にPROを提示する。**

■㊶ 良いPRO導線例①

FREE結果：

「CPC30円なら必要CVR2.50％」

↓

CTA：

**「この商品条件を保存して、次回からCPCだけ入力する」**

PRO

■㊷ 良いPRO導線例②

レビュー結果：

「★4.50には★5があと40件必要」

↓

CTA：

**「この商品のレビューKPIを保存」**

PRO

■㊸ 良いPRO導線例③

在庫結果：

「30日消化には10個/日必要」

↓

CTA：

**「在庫目標を保存して進捗管理」**

PRO

■㊹ 良いPRO導線例④

RPP結果：

「CPC上限36円」

↓

CTA：

**「全商品をCSVで一括計算」**

PRO

■㊺ 良くないPaywall

× 結果を見るには会員登録

× 3回以上計算すると有料

× 数字の途中まで見せてロック

× 毎回PROモーダルを強制表示

は避ける。

■㊻ PRO訴求表示回数

計算完了後、

画面下部にインラインCTAを1つ表示。

ユーザーがPRO操作をクリックしたときのみモーダル表示。

■㊼ Paywallモーダル内容

例：

「PROならこの結果を保存できます」

・店舗設定を保存

・商品条件を保存

・次回入力を省略

・シナリオ比較

・履歴

↓

月額4,980円

「PROを開始する」

■㊽ Paywallで24機能を全部説明しない

そのユーザーが今やろうとしたことに合わせて訴求を変える。

■㊾ Contextual Paywall

例：

CSVクリック

↓

「PROなら最大1,000商品をまとめて計算できます」

履歴クリック

↓

「PROなら過去の計算結果を保存・比較できます」

という形。

■㊿ PRO申込フロー

FREE利用

↓

PRO CTA

↓

ログイン / アカウント作成

↓

料金確認

↓

月払い / 年払い選択

↓

申込確認

↓

Stripe Checkout

↓

決済

↓

Webhook

↓

PRO有効化

↓

PROオンボーディング

■51 認証

Supabase Authを利用する。

Supabase Authはパスワード、Magic Link、OTP、ソーシャルログイン等に対応し、JWTとRLSを組み合わせた認可設計が可能。

■52 MVPログイン方式

P0：

メールアドレス＋パスワード

を基本。

■53 P1ログイン

・Googleログイン。

・Magic Link。

を追加可能。

■54 Stripe Customer作成タイミング

アカウント登録だけでは作らない。

**初めてCheckoutへ進む時点**

でStripe Customerを作成する。

■55 理由

無料登録だけでStripe上に大量の未課金Customerを作らないため。

■56 決済基盤

Stripe Billing + Stripe Checkoutを利用する。

Stripe公式ではCheckoutを使った固定料金サブスクリプション構築、Checkout後のアクセス付与、Customer Portalとの連携が提供されている。

■57 Stripe Product構造

Product：

PRO

Prices：

PRO_MONTHLY

PRO_ANNUAL

の2Price。

■58 内部プランコード

planCode：

FREE

PRO

billingInterval：

NONE

MONTH

YEAR

と分離する。

■59 月払いStripe Price

環境変数：

STRIPE_PRO_MONTHLY_PRICE_ID

■60 年払いStripe Price

環境変数：

STRIPE_PRO_ANNUAL_PRICE_ID

■61 Stripe Checkout作成API

例：

POST

/api/billing/create-checkout-session

■62 入力

billingInterval:

MONTH | YEAR

■63 サーバー側処理

・ログイン確認。

・workspace確認。

・既存PRO契約確認。

・Stripe Customer取得または作成。

・許可されたPrice IDをサーバー側で選択。

・Checkout Session作成。

・Checkout URL返却。

■64 セキュリティ上重要

クライアントから、

「price=4980」

などの料金金額を受け取って信用しない。

■65 クライアントから受け取る値

MONTH

または

YEAR

程度に限定。

■66 実際のStripe Price ID

必ずサーバー側で決定する。

■67 Checkout成功URL

例：

/billing/success

■68 CheckoutキャンセルURL

例：

/pricing?checkout=cancelled

■69 決済成功ページの注意

Stripe Checkoutからsuccess URLへ戻ったことだけで、

PROを有効化してはいけない。

■70 PRO有効化の正

**Stripe Webhookを正とする。**

Stripeではサブスクリプション状態の変化が非同期で起こるため、Webhookで状態変更を受け取る構成が推奨されている。

■71 決済後フロー

Checkout完了

↓

successページ

↓

「PROを有効化しています」

↓

DB subscription状態をポーリング

↓

ACTIVE確認

↓

「PROが利用可能になりました」

■72 Webhook遅延時

数秒〜短時間PRO状態が未反映でも、

エラー表示しない。

「決済確認中」

とする。

■73 Stripe Webhookエンドポイント

POST

/api/webhooks/stripe

■74 必須Webhook

MVPでは最低限、

checkout.session.completed

customer.subscription.created

customer.subscription.updated

customer.subscription.deleted

invoice.paid

invoice.payment_failed

を処理する。

■75 Webhook署名検証

必須。

StripeはWebhook処理時に`Stripe-Signature`を用いた署名確認を推奨している。

■76 Raw Body

Webhook署名検証に必要な生のrequest bodyを保持する実装にする。

■77 Webhook重複対策

StripeのWebhookは同一イベントが複数回届く可能性があるため、

処理済みStripe event ID

を保存して二重処理を防止する。

■78 Webhook順序

イベント到着順を前提にロジックを組まない。

Stripeはイベント生成順での配信を保証していないため、必要に応じてSubscriptionオブジェクトの現在状態を再取得して同期する。

■79 stripe_eventsテーブル

主な項目：

id

stripe_event_id

event_type

processed_at

processing_status

error_message

■80 stripe_event_id

UNIQUE制約を設定。

■81 Subscriptionテーブル

subscriptions

・id

・workspace_id

・provider

・stripe_customer_id

・stripe_subscription_id

・stripe_price_id

・plan_code

・billing_interval

・status

・current_period_start

・current_period_end

・cancel_at_period_end

・trial_end

・past_due_since

・created_at

・updated_at

■82 Stripe状態をローカルへミラー

Stripeを課金状態の原本とし、

Supabaseのsubscriptionsは、

アプリ内権限判定用キャッシュ・ミラー

として使用。

■83 PRO権限状態

基本的に、

ACTIVE

TRIALING

でPRO。

■84 PAST_DUE

支払い失敗時。

■85 PAST_DUE猶予

MVP案：

最初の支払い失敗から

**7日間**

はPRO利用を継続。

■86 支払い失敗時UI

上部バナー：

「お支払いを確認できませんでした。決済方法をご確認ください。」

↓

「支払い方法を更新」

↓

Stripe Customer Portal

■87 猶予終了後

まだ支払いが復旧しない場合、

新規保存

CSV取込

新規シナリオ作成

を停止。

■88 既存データ

支払い失敗ですぐ削除しない。

■89 解約後データ

解約後も保存商品・履歴を即削除しない。

■90 再契約

同一workspaceで再契約した場合、

過去商品

過去シナリオ

履歴

を再利用できる。

■91 Customer Portal

課金管理は自前で全部作らず、

Stripe Customer Portalを利用する。

Stripe Customer Portalでは、支払い方法、請求情報、請求書、サブスクリプション状態等を利用者自身が管理できる。

■92 請求管理ボタン

PRO設定画面：

**「契約・お支払いを管理」**

↓

Customer Portal Session作成

↓

Stripeへリダイレクト。

■93 Portal Session

セキュリティ上、

ユーザーがクリックしたタイミングでサーバー側から生成。

StripeもPortal Sessionをオンデマンドで作成する方式を提供している。

■94 Customer Portalで可能にすること

・支払い方法変更。

・請求情報確認。

・請求書確認。

・解約。

・可能なら月払い/年払い変更。

■95 解約方針

基本：

**次回更新停止**

とする。

■96 解約時

例：

8月14日に契約

次回更新：

9月14日

8月25日に解約

↓

9月14日まではPRO。

■97 即時機能停止しない

解約予約：

cancel_at_period_end = true

として扱う。

■98 解約画面

表示：

「9月14日までPROをご利用いただけます」

と具体的な終了日を表示。

■99 解約理由

P1で、

・価格。

・使わなかった。

・必要機能不足。

・CSV不足。

・他サービス利用。

・一時休止。

・その他。

を取得。

■100 自動返金

MVPでは解約時の自動日割返金は実装しない。

■101 例外返金

管理者がStripe側で個別対応可能な運用を用意する。

■102 月払い→年払い

可能にする。

■103 年払い→月払い

可能にする。

■104 契約周期変更タイミング

MVPでは混乱を避けるため、

**次回更新時から変更**

を基本方針とする。

■105 Customer Portal設定

Stripe Customer Portalはプラン変更、解約、支払い方法変更等を設定できるため、MVPではPortal側の標準機能を最大限利用する。

■106 無料トライアル

**MVPでは常設トライアルを実施しない。**

■107 トライアルを付けない理由

FREEで24ツールの基本価値を十分体験できるため。

■108 SaaSとしての体験順

FREEで計算価値を確認

↓

「保存したい」

「一括計算したい」

となった時点でPRO購入

の方が分かりやすい。

■109 将来トライアル

P1として、

7日間PRO体験

をキャンペーン等で導入可能。

■110 Stripeトライアル

Stripe Billing自体はサブスクリプションへtrial periodを設定する仕組みを提供しているため、将来追加可能。

■111 trial状態

trialing

をPRO対象状態として扱う。

■112 trial終了前

将来トライアルを導入する場合、

customer.subscription.trial_will_end

も処理対象。

■113 トライアル乱用防止

trial利用済みworkspaceを記録。

■114 MVPではトライアル関連コードを最小化

subscriptionテーブルにはtrial_endを持つが、

常設利用しない。

■115 割引クーポン

MVPでは不要。

■116 P1

・ローンチキャンペーン。

・年間契約割引。

・紹介コード。

等をStripe側のPromotion Code等で実装可能。

■117 価格ページ

/pricing

■118 価格ページ中心構成

FREE

0円

「今すぐ無料で使う」

PRO

4,980円 / 月

「PROを始める」

■119 年払い切替

月払い

年払い

のトグル。

■120 PROで強調する5価値

・毎回の入力を省略。

・商品保存。

・履歴。

・シナリオ比較。

・CSV一括処理。

■121 価格ページで24ツールを大量列挙しない

「24種類の判断ツールすべて利用可能」

程度にまとめ、

課金価値はPRO機能へ置く。

■122 比較で重要な表現

FREE：

「1回の判断」

PRO：

「日々の店舗運営」

と見せる。

■123 申込確認画面

Stripeへ移動する前に、

/checkout/confirm

を用意する。

■124 表示内容

・プラン名。

・月払い / 年払い。

・請求額。

・請求周期。

・自動更新。

・次回以降も継続課金されること。

・解約方法。

・解約後の利用期限。

・利用規約。

・プライバシーポリシー。

・特定商取引法に基づく表示へのリンク。

■125 日本向けサブスク表示

インターネット通信販売では、申込みの最終確認画面において販売価格・支払方法等の契約上重要な事項を明確に表示することが求められており、定期購入・サブスクリプションでは契約条件や解約方法等の明確な表示も重要になる。ローンチ前に実際の販売主体・契約条件に合わせて専門家確認を行う。

■126 年払い確認表示例

PRO 年払い

49,800円 / 年

本日：

49,800円

次回更新：

2027年8月14日

自動更新：

あり

解約：

次回更新日前まで可能

など。

■127 誤認させない表示

「月換算4,150円」

だけで購入ボタンへ進ませない。

■128 同意

「利用規約・プライバシーポリシーを確認しました」

を申込前に表示。

■129 最終法務確認

・利用規約。

・プライバシーポリシー。

・特商法表示。

・返金ポリシー。

・価格表示。

・自動更新。

・解約方法。

を正式ローンチ前に確定する。

■130 Supabase構成

Supabase：

・Auth。

・Postgres。

・必要に応じてStorage。

を利用。

■131 profiles

・id = auth.users.id

・display_name

・created_at

・updated_at

■132 workspaces

・id

・name

・owner_user_id

・created_at

・updated_at

■133 workspace_members

将来チーム対応を見越し、

・workspace_id

・user_id

・role

・created_at

■134 role

MVP：

OWNER

のみでもよい。

■135 将来

OWNER

ADMIN

MEMBER

VIEWER

など。

■136 stores

・id

・workspace_id

・store_name

・store_code

・created_at

・updated_at

■137 store_settings

代表例：

・default_sales_fee_rate

・default_shipping_cost

・default_customer_shipping_charge

・default_point_burden_rate

・default_min_profit_rate

・default_coupon_burden

・default_aov

・created_at

・updated_at

■138 楽天手数料をハードコードしない

販売関連費率等は、

ユーザー入力

または店舗設定

として扱う既存方針を維持する。

■139 products

代表項目：

・id

・workspace_id

・store_id

・product_code

・sku

・product_name

・selling_price

・cost

・shipping_cost

・sales_fee_rate

・point_burden_rate

・current_cpc

・current_cvr

・current_rating

・review_count

・inventory

・created_at

・updated_at

■140 scenarios

・id

・workspace_id

・store_id

・product_id

・tool_code

・scenario_name

・input_json

・result_json

・created_at

・updated_at

■141 tool_runs

PRO履歴用。

・id

・workspace_id

・user_id

・tool_code

・product_id

・input_json

・result_json

・created_at

■142 保存方法

各24ツール専用テーブルを最初から大量に作る必要はない。

■143 MVP

共通形式：

tool_code

input_json

result_json

で開始。

■144 理由

ツール追加・計算項目変更に柔軟に対応するため。

■145 検索に必要な主要項目

product_id

tool_code

created_at

などはJSON外へ出す。

■146 RLS

Supabaseの公開対象テーブルにはRLSを有効化し、

workspace membershipに基づき自分のworkspaceデータだけ読めるようにする。

Supabaseでは公開スキーマのテーブルにRLSを有効化し、Authと組み合わせて行単位でアクセス制御する設計が推奨される。

■147 RLS基本条件

例：

auth.uid()

が

workspace_members.user_id

に存在し、

対象row.workspace_id

と一致すること。

■148 別ユーザーのデータ

絶対に取得不可。

■149 Service Role

Supabase service role相当の高権限キーをブラウザへ出さない。

Supabase公式もRLSを回避できるService Keyを顧客側へ公開しないよう明示している。

■150 Stripe Secret Key

ブラウザに出さない。

■151 Webhook Secret

ブラウザに出さない。

■152 主な環境変数

SUPABASE_URL

SUPABASE_ANON_KEY

SUPABASE_SERVICE_ROLE_KEY

STRIPE_SECRET_KEY

STRIPE_WEBHOOK_SECRET

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

STRIPE_PRO_MONTHLY_PRICE_ID

STRIPE_PRO_ANNUAL_PRICE_ID

APP_URL

■153 権限判定

フロントだけで、

if (plan === 'PRO')

として保護しない。

■154 必須

PRO保存API

CSV API

履歴API

ではサーバー側でsubscription entitlementを検証。

■155 getEntitlements()

共通関数を作る。

■156 出力例

canSaveStore

canSaveProduct

canSaveScenario

canViewHistory

canCompareScenarios

canImportCsv

canExportCsv

canUsePersistentHandoff

■157 FREE entitlement

canCalculateBasic = true

canCopyResult = true

その他PRO機能 = false

■158 PRO entitlement

PRO対象状態ならtrue。

■159 課金状態を各画面で直接判定しない

各コンポーネントが、

stripe_status

を直接参照しない。

■160 理由

将来的に、

BUSINESS

キャンペーン付与

管理者付与

などを追加しやすくするため。

■161 Admin Grant

テスター等へ期間限定PROを付与できる仕組みをP1で用意。

例：

ADMIN_GRANTED_PRO

expires_at

■162 課金なしテストユーザー

社内確認でStripe決済を毎回行わずにPROテスト可能。

■163 PROオンボーディング

契約直後に長い設定フォームを強制しない。

■164 初回PRO画面

「PROが有効になりました」

↓

選択：

「店舗設定を登録する」

「商品を登録する」

「あとで設定する」

■165 店舗設定ウィザード

最初は5項目前後。

例：

販売関連費率

標準送料

標準ポイント店舗負担率

最低利益率

標準AOV

■166 高度設定

後から。

■167 商品登録

手入力：

1商品

CSV：

複数商品

の2方式。

■168 最初の成功体験

PRO契約後5分以内に、

商品選択

↓

ツール起動

↓

主要入力が自動入力済み

という体験を作る。

■169 PRO Activation KPI

「契約した」

ではなく、

**店舗設定保存＋商品1件登録＋ツール1回利用**

をActivationとする。

■170 履歴

PROでは計算結果を自動保存可能。

■171 自動保存設定

初期：

ON

でもよい。

■172 履歴名

例：

2026/08/14 16:30

商品A

RPP必要CVR

CPC30円

必要CVR2.50％

■173 名前変更

「8月RPP見直し」

など。

■174 シナリオ比較

FREE：

入力を変えて1件ずつ見る。

PRO：

A/B/Cを同時比較。

■175 例

SALE価格：

4,980円

4,480円

3,980円

↓

利益

必要販売数

利益率

を横並び。

■176 CSV

PROの強い課金理由とする。

■177 CSV利用例

・商品別CPC上限。

・商品別必要CVR。

・商品別利益。

・在庫消化日数。

・レビューKPI。

等。

■178 CSV件数

MVP暫定：

1ファイル1,000行。

■179 大容量

P2/BUSINESSで拡張。

■180 CSVエラー

1行の不正で全件失敗させない。

■181 結果

成功：

980行

エラー：

20行

としてエラー理由を返す。

■182 FREE CSV

利用不可。

■183 CSV Paywall

「1商品ずつ計算する」

FREE

「CSVでまとめて計算する」

PRO

という非常に分かりやすい差を作る。

■184 エクスポート

FREE：

結果コピー。

PRO：

CSVダウンロード

シナリオ出力。

■185 ユーザーデータエクスポート

契約終了後でも、

ユーザー自身の保存データ取得手段は別途用意する方向とする。

課金解除を理由に自分のデータを完全に取り出せない状態にはしない。

■186 PRO解約後UI

ダッシュボード：

「PRO契約は終了しています」

保存データ：

閲覧のみ

再契約CTA：

「PROを再開して編集」

■187 データ削除

解約＝データ削除

にはしない。

■188 アカウント削除

ユーザーが明示的に、

「アカウントを削除」

した場合に別処理。

■189 退会確認

削除対象を明示。

■190 課金解約とアカウント削除を分離

非常に重要。

「PROを解約」

≠

「アカウントとデータを削除」

■191 支払い失敗時のデータ

削除しない。

■192 契約再開

同一workspaceへPRO entitlementを戻す。

■193 二重契約防止

既にactive subscriptionがあるworkspaceが、

再度Checkoutを開始しないようにする。

■194 PROボタン

既存PROなら、

「現在PROをご利用中です」

↓

「契約管理」

へ。

■195 ダブルクリック対策

Checkout作成ボタンを押したら一時disable。

■196 Server側でも確認

既存active subscriptionを確認。

■197 Stripeイベントの二重処理

stripe_event_id UNIQUE。

■198 課金管理画面

/settings/billing

■199 表示内容

現在プラン：

PRO

請求周期：

月払い

料金：

4,980円 / 月

次回更新：

2026/09/14

契約状態：

有効

↓

「契約・お支払いを管理」

■200 解約予約中

現在プラン：

PRO

終了予定：

2026/09/14

↓

「終了日まではPROをご利用いただけます」

■201 FREE画面

現在プラン：

FREE

↓

PROにすると：

・保存

・履歴

・CSV

・比較

・自動入力

■202 アプリ内PROバッジ

PROユーザー：

PRO

バッジ。

■203 商品ページPRO機能

「商品保存済み」

「店舗設定適用中」

を視覚化。

■204 PROだから計算結果を変えない

FREEとPROで、

同じ入力なら同じ計算結果。

■205 非常に重要

× PROの方が正しい結果

ではない。

■206 PRO差

**結果の質ではなく、運用効率。**

■207 これによる信頼

FREEでも計算の正確性を体験できる。

■208 PRO継続理由①

自店データが保存されている。

■209 PRO継続理由②

毎月の履歴が蓄積。

■210 PRO継続理由③

商品を選択するだけで計算できる。

■211 PRO継続理由④

CSVで作業時間が減る。

■212 PRO継続理由⑤

複数ツールがつながる。

■213 PRO継続理由⑥

月次KPI管理に使える。

■214 SaaSホーム

PROでは単なるツール一覧だけでなく、

「今日使う判断」

を出す。

■215 例

最近使った商品

最近の計算

保存シナリオ

月次目標

への導線。

■216 MVPダッシュボード

過剰に作り込まない。

■217 MVPダッシュボード最低限

・最近使った商品。

・最近使ったツール。

・保存シナリオ。

・店舗設定。

■218 自動アラート

P2。

MVPでは不要。

■219 課金CTA配置

・価格ページ。

・ツール結果下。

・保存ボタン。

・CSVボタン。

・履歴ページ。

・比較ボタン。

■220 CTA文言

「PROにアップグレード」

だけでは弱い。

■221 Context CTA

「この結果を保存」

「全商品を一括計算」

「次回の入力を省略」

「3案を比較」

などにする。

■222 課金画面で強調するもの

機能数ではなく、

**削減できる手入力**

を訴求。

■223 例

「毎回6項目入力」

↓

「PROなら商品を選ぶだけ」

■224 MRR指標

月次継続売上を主要KPIとして管理。

■225 課金KPI

・FREE MAU。

・計算完了数。

・PRO CTA表示数。

・PRO CTAクリック率。

・アカウント作成率。

・Checkout開始率。

・Checkout完了率。

・FREE→PRO率。

・月払い比率。

・年払い比率。

・MRR。

・解約率。

・支払失敗率。

・再契約率。

■226 Product Activation KPI

PRO契約後7日以内に、

・店舗設定保存。

・商品1件保存。

・3回以上ツール利用。

の達成率を見る。

■227 PRO機能別KPI

・商品保存利用率。

・店舗設定利用率。

・CSV利用率。

・履歴閲覧率。

・シナリオ比較率。

・ツール間遷移率。

■228 解約分析

解約理由

×

利用機能

×

契約期間

を見る。

■229 重要

「PRO契約者数」

だけで判断しない。

■230 Webhook Analytics

subscription_activated

invoice_paid

invoice_payment_failed

cancellation_scheduled

subscription_expired

subscription_reactivated

■231 FREE funnelイベント

tool_view

calculation_completed

pro_cta_view

pro_cta_click

signup_started

signup_completed

checkout_started

checkout_completed

■232 年払いイベント

annual_plan_selected

■233 P0実装

最優先。

■234 P0 認証

・Supabase Auth。

・アカウント登録。

・ログイン。

・ログアウト。

・パスワード再設定。

■235 P0 課金

・Stripe Product。

・月払いPrice。

・年払いPrice。

・Checkout。

・Webhook。

・Customer Portal。

・解約。

・支払い失敗処理。

■236 P0 権限

・FREE。

・PRO。

・server-side entitlement。

・RLS。

■237 P0 PRO価値

・店舗設定保存。

・商品保存。

・シナリオ保存。

・履歴。

・ツール間永続引継ぎ。

・最低限のCSV一括処理。

■238 P0 UX

・Paywall。

・Pricing。

・Billing画面。

・PROオンボーディング。

・解約状態表示。

■239 P1

・Googleログイン。

・Magic Link。

・複数シナリオ強化。

・高度CSV。

・年/月プラン変更UX。

・プロモーションコード。

・7日トライアル機能。

・解約理由。

・日次/月次ダッシュボード。

・データエクスポート強化。

■240 P2

・BUSINESS。

・複数店舗。

・複数ユーザー。

・権限管理。

・店舗横断比較。

・大量CSV。

・自動アラート。

・定期レポート。

・API連携。

・チーム管理。

■241 MVPでは実装しない課金モデル

・従量課金。

・ツール単品購入。

・1計算○円。

・ポイント購入。

・AIクレジット。

・広告掲載によるFREE収益。

■242 理由

料金体系をシンプルに保つ。

■243 MVP課金モデル

0円

または

4,980円/月

または

49,800円/年

だけ。

■244 24ツールごとの個別課金

行わない。

■245 「RPPパック」

「在庫パック」

などもMVPでは作らない。

■246 理由

ユーザーに、

「この計算はどのプラン？」

と考えさせないため。

■247 PROなら全部

**PRO＝24ツールすべての高度機能が利用可能**

とする。

■248 FREEなら全部

**FREE＝24ツールすべての基本計算が利用可能**

とする。

■249 この対称性が重要

非常に説明しやすい。

■250 セキュリティ完成条件

・Stripe secretがclient bundleにない。

・Supabase service roleがclient bundleにない。

・Webhook署名検証。

・RLS有効。

・別workspaceデータ取得不可。

・PRO APIはserver entitlement確認。

・Stripeイベント重複処理なし。

■251 Billingテスト①

FREEユーザーが24ツールを利用可能。

■252 Billingテスト②

FREEユーザーが保存クリック。

↓

Paywall。

■253 Billingテスト③

月払いCheckout成功。

↓

Webhook。

↓

PRO有効。

■254 Billingテスト④

年払いCheckout成功。

↓

billing_interval = YEAR。

■255 Billingテスト⑤

Checkoutキャンセル。

↓

FREEのまま。

■256 Billingテスト⑥

success URLへ直接アクセス。

↓

PROにならない。

■257 Billingテスト⑦

Webhook同一イベント2回。

↓

1回のみ処理。

■258 Billingテスト⑧

Webhook順序入替。

↓

最終的なStripe Subscription状態と一致。

■259 Billingテスト⑨

月額解約。

↓

current_period_endまではPRO。

■260 Billingテスト⑩

期間終了。

↓

FREEへ。

■261 Billingテスト⑪

解約後も商品データが消えない。

■262 Billingテスト⑫

再契約。

↓

以前の商品が復帰。

■263 Billingテスト⑬

invoice.payment_failed。

↓

PAST_DUE表示。

■264 Billingテスト⑭

支払い方法更新＋決済回復。

↓

ACTIVEへ復帰。

■265 Billingテスト⑮

別workspaceのproduct IDをAPIに送信。

↓

アクセス拒否。

■266 Billingテスト⑯

FREEがPRO保存APIを直接叩く。

↓

403。

■267 Billingテスト⑰

クライアントでPRO表示を偽装。

↓

server APIでは拒否。

■268 Billingテスト⑱

年払い価格表示。

↓

「月換算」だけではなく「49,800円/年」を明示。

■269 Billingテスト⑲

申込確認。

↓

自動更新・料金・周期・解約方法を確認可能。

■270 Billingテスト⑳

Customer Portalから支払い方法変更可能。

■271 MVP完成条件①

ユーザーがログインなしでFREEを使える。

■272 MVP完成条件②

FREE計算結果が課金で隠されていない。

■273 MVP完成条件③

保存・履歴・CSVなどで自然にPROへ誘導できる。

■274 MVP完成条件④

月払い4,980円で契約可能。

■275 MVP完成条件⑤

年払い49,800円で契約可能。

■276 MVP完成条件⑥

Stripe決済成功後のみPROになる。

■277 MVP完成条件⑦

解約を自分で実行できる。

■278 MVP完成条件⑧

支払い方法を自分で変更できる。

■279 MVP完成条件⑨

過去請求情報へアクセスできる。

Stripe Customer Portalは請求書や支払い情報の自己管理機能を提供するため、ここを利用する。

■280 MVP完成条件⑩

解約後すぐデータが消えない。

■281 MVP完成条件⑪

再契約時にデータが戻る。

■282 MVP完成条件⑫

他ユーザーの店舗・商品データへアクセスできない。

■283 MVP完成条件⑬

24ツール側が、

FREE/PROの課金判定ロジックを個別実装していない。

■284 共通BillingModule

新規モジュール：

BillingService

■285 BillingService責務

・Checkout作成。

・Customer管理。

・Subscription同期。

・Customer Portal Session作成。

・Price判定。

・Webhook処理。

■286 EntitlementService

新規モジュール：

EntitlementService

■287 EntitlementService責務

・workspaceの契約状態取得。

・FREE/PRO判定。

・機能権限出力。

・PAST_DUE猶予判定。

・Admin Grant判定。

■288 SubscriptionRepository

DBアクセスを分離。

■289 StripeWebhookService

イベント種別ごとの処理を分離。

■290 画面でStripeオブジェクトを直接扱わない

アプリ側は、

BillingStatus

Entitlements

だけを見る。

■291 Stripe依存を局所化

将来決済プロバイダー変更が必要でも、

24ツール本体へ影響させない。

■292 共通ToolContext

PROでは、

ToolContext

に、

workspace

store

product

entitlements

を持たせる。

■293 FREE ToolContext

product未保存。

一時入力だけ。

■294 PRO ToolContext

保存商品データを自動展開。

■295 これが最重要技術差

24個の計算ロジック自体は、

FREEとPROで共通。

■296 計算ロジックに課金判定を混ぜない

Calculator関数：

純粋計算。

Subscription：

別レイヤー。

■297 良い構造

UI

↓

ToolInput

↓

Calculator

↓

Result

保存する場合だけ

↓

Entitlement確認

↓

Supabase保存

■298 悪い構造

Calculator内部で、

if PRO

などを行う。

■299 理由

テストが難しくなり、

FREE/PROで計算差異が発生する危険がある。

■300 最重要UX

無料利用者に、

「有料にしないと使えない」

と思わせない。

■301 その代わり

何度も使うほど、

「毎回入力するのが面倒」

という課題が自然に生まれる。

■302 そこをPROが解決

**入力の省略**

**保存**

**比較**

**一括処理**

が課金理由。

■303 最重要収益設計

FREEユーザーを邪魔してPROへ押し込むのではなく、

**FREEを便利に使った人ほどPROが欲しくなる構造**

を作る。

■304 このSaaSのモート

計算式そのものは模倣可能。

■305 本当の資産

・保存された店舗設定。

・商品データ。

・過去シナリオ。

・月次履歴。

・ツール間のデータ関係。

・CSV運用。

・ユーザーの業務フロー。

である。

■306 つまり

ユーザーが使うほど、

自分専用の楽天運営環境になっていく。

■307 サブスク継続の理由

「来月も24計算機を使いたい」

では弱い。

■308 正しい継続理由

「自店の商品・条件・履歴が全部ここにある」

とする。

■309 プロダクトとしての最終形

Google検索

↓

FREE一問一答ツール

↓

商品保存

↓

PRO

↓

店舗設定

↓

ツール間連携

↓

CSV

↓

月次履歴

↓

店舗運営ダッシュボード

という成長導線。

■310 ローンチ順序

STEP1

24ツールFREE公開。

■311 STEP2

認証・PRO課金。

■312 STEP3

店舗設定・商品保存。

■313 STEP4

履歴・シナリオ。

■314 STEP5

ツール間連携。

■315 STEP6

CSV一括。

■316 STEP7

月次ダッシュボード。

■317 STEP8

BUSINESS・複数店舗。

■318 MVPで最も重要なPRO機能

すべてを一気に作る必要はない。

最初に絶対必要なのは、

**① 店舗設定保存**

**② 商品保存**

**③ シナリオ・履歴保存**

**④ ツール間自動入力**

**⑤ CSV一括処理**

の5つ。

■319 特に重要

商品を選択した瞬間、

原価

送料

販売関連費率

ポイント負担率

などが入力済みになる体験。

■320 これが課金価値の中心

単なる履歴保存より、

**「毎回入力しなくていい」**

の方が即座に価値を感じやすい。

■321 PRO価格に対する価値訴求

4,980円を、

「24ツール利用料」

として見せない。

■322 正しい訴求

**「楽天運営の計算・確認作業を毎回やり直さなくてよくする月額料金」**

とする。

■323 価格ページメインコピー案

**計算は無料。
保存・連携・一括運用はPRO。**

■324 サブコピー案

「楽天店舗の利益・広告・販促判断を、毎回ゼロから計算しない。」

■325 最大の差別化メッセージ

一般的な分析ツールのように、

「数字をたくさん見せる」

こと自体を目的にしない。

■328 このSaaS

数字を入力

↓

**「だから何が必要なのか」**

まで逆算する。

■329 全24ツール共通思想

予測ではなく、

条件成立に必要な数値。

この思想はプロジェクト当初から最重要ルールとして設定されている。

■330 課金後も同じ思想

PROになったから、

AIで根拠のない予測を増やさない。

■331 PROの高度化

予測精度ではなく、

・入力省略。

・データ量。

・比較。

・保存。

・一括処理。

・履歴。

を高度化する。

■332 最終プロダクト定義

これは、

「楽天の計算機サイト」

ではなく、

**楽天店舗運営者向け意思決定SaaS**

と定義する。

【重要まとめ】

このSaaSの課金モデルは、

**FREE＝答えを出す**

**PRO＝店舗運営の仕組みにする**

という2段構造にする。

FREE：

0円

・①〜㉔の基本計算

・ログイン不要

・計算回数制限なし

・結果表示

・結果コピー

・一時的なツール間引継ぎ

PRO：

**4,980円 / 月**

または

**49,800円 / 年**

・店舗設定保存

・商品保存

・毎回の入力省略

・シナリオ保存

・履歴

・複数案比較

・永続的なツール間データ連携

・CSV一括処理

・月次KPI管理

を提供する。

課金ポイントは、

**計算結果そのものではない。**

ユーザーが、

「この結果を保存したい」

「次から同じ原価や送料を入力したくない」

「20商品をまとめて計算したい」

「先月の計算と比較したい」

と思った瞬間にPRO価値が発生する。

技術構成は、

Next.js

↓

Supabase Auth / Postgres / RLS

↓

Stripe Checkout / Billing

↓

Stripe Webhook

↓

Subscription同期

↓

EntitlementService

↓

PRO機能解放

という構造にする。

Stripe Checkoutで継続課金を受け付け、Webhookを課金状態同期の正とし、Customer Portalで支払い方法・請求情報・解約等を自己管理できる構成とする。Stripeはこれらのサブスクリプション構成を公式に提供している。

Supabase側ではworkspace単位でデータを持ち、全業務データへworkspace_idを付与し、Auth + RLSで他ユーザー・他店舗データを遮断する。

トライアルはMVPでは不要。

24ツールのFREEそのものを体験版とする。

解約時は、

すぐ機能停止

すぐデータ削除

にはせず、

契約期間終了までPRO利用

↓

終了後FREE

↓

保存データは保持

↓

再契約で復帰

という設計にする。

そして最重要なのは、

**「24個の計算ツールを月4,980円で売る」のではない。**

売るものは、

**「自店の商品・利益・広告・販促条件を保存し、楽天運営の判断を毎回ゼロからやり直さなくてよくする環境」**

である。

FREEのSEO集客力を落とさず、

FREEを使えば使うほどPROの便利さが理解できる構造にする。

最終的な導線は、

**Google検索**

↓

**FREE 24ツール**

↓

**その場で答え**

↓

**保存したい**

↓

**PRO**

↓

**店舗設定・商品保存**

↓

**自動入力**

↓

**ツール間連携**

↓

**CSV**

↓

**履歴・月次管理**

↓

**毎日の楽天店舗運営で継続利用**

とする。

これを、①〜㉔の24ツールを収益化するSaaSの基本課金仕様とする。
