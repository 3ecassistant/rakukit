import { Metadata } from "next";
import Link from "next/link";
import LegalDocument, { LegalSection } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
};

export default function PrivacyPage() {
  return (
    <LegalDocument title="プライバシーポリシー" updatedAt="2026年8月15日">
      <p>
        RakuKit運営者（以下「当社」といいます）は、本サービス「RakuKit」（以下「本サービス」といいます）における、ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます）を定めます。
      </p>

      <LegalSection title="第1条（収集する情報）">
        <p>当社は、本サービスの提供にあたり、以下の情報を取得することがあります。</p>
        <ul className="list-inside list-disc pl-2">
          <li>アカウント登録時にご提供いただくメールアドレス</li>
          <li>PROプランご契約時にStripe社を通じて処理される決済関連情報（当社はクレジットカード番号そのものを保持しません）</li>
          <li>PRO機能をご利用の際にユーザーが任意で保存する店舗設定・商品情報・計算履歴等のデータ</li>
          <li>お問い合わせフォームからご送信いただくお名前・メールアドレス・お問い合わせ内容</li>
          <li>本サービスの利用状況に関するログ情報（アクセス日時、IPアドレス、ブラウザ情報等）</li>
        </ul>
        <p>
          なお、FREEプランの各種計算ツールは、ログインなしでご利用いただけ、入力内容はお使いのブラウザ内でのみ処理され、当社のサーバーには送信・保存されません。
        </p>
      </LegalSection>

      <LegalSection title="第2条（利用目的）">
        <p>当社は、取得した情報を以下の目的で利用します。</p>
        <ul className="list-inside list-disc pl-2">
          <li>本サービス（PRO機能を含む）の提供、維持、保護及び改善のため</li>
          <li>ユーザー認証及びアカウント管理のため</li>
          <li>PROプランの料金請求及び決済処理のため</li>
          <li>お問い合わせへの対応のため</li>
          <li>本サービスに関する重要なお知らせをお伝えするため</li>
          <li>利用規約に違反する行為への対応のため</li>
        </ul>
      </LegalSection>

      <LegalSection title="第3条（第三者提供）">
        <p>
          当社は、次に掲げる場合を除いて、あらかじめユーザーの同意を得ることなく、第三者に個人情報を提供することはありません。
        </p>
        <ul className="list-inside list-disc pl-2">
          <li>法令に基づく場合</li>
          <li>人の生命、身体または財産の保護のために必要がある場合であって、本人の同意を得ることが困難であるとき</li>
          <li>国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合</li>
        </ul>
      </LegalSection>

      <LegalSection title="第4条（外部サービスの利用）">
        <p>
          当社は、本サービスの提供にあたり、以下の外部サービスを利用しており、業務の遂行に必要な範囲で情報を委託しています。各社のプライバシーポリシーも併せてご確認ください。
        </p>
        <ul className="list-inside list-disc pl-2">
          <li>
            <span className="font-semibold">Supabase</span>
            （認証情報及びPRO機能で保存されるデータの保管）
          </li>
          <li>
            <span className="font-semibold">Stripe, Inc.</span>
            （PROプランの決済処理。クレジットカード情報はStripe社が管理し、当社では保持しません）
          </li>
          <li>
            <span className="font-semibold">Resend</span>
            （お問い合わせフォームからのメール送信）
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="第5条（Cookie等の使用）">
        <p>
          本サービスは、ログイン状態の維持等のためにCookieを使用します。将来的にアクセス解析ツールを導入する場合、その内容を本ポリシーに追記し、あらためて掲示します。
        </p>
      </LegalSection>

      <LegalSection title="第6条（安全管理措置）">
        <p>
          当社は、取得した個人情報の漏えい、滅失またはき損の防止その他の個人情報の安全管理のために、必要かつ適切な措置を講じます。
        </p>
      </LegalSection>

      <LegalSection title="第7条（開示・訂正・利用停止等の請求）">
        <p>
          ユーザーは、当社の保有する自己の個人情報について、開示、訂正、追加、削除、利用停止を請求することができます。ご希望の場合は、次条のお問い合わせ窓口までご連絡ください。当社は、ご本人からのご請求であることを確認のうえ、合理的な期間内に対応します。
        </p>
        <p>
          PROプランを解約された場合でも、保存されたデータは即座には削除されません。データの削除をご希望の場合は、お問い合わせ窓口までご連絡ください。
        </p>
      </LegalSection>

      <LegalSection title="第8条（お問い合わせ窓口）">
        <p>
          本ポリシーに関するお問い合わせは、
          <Link href="/contact" className="text-red-600 hover:underline">
            お問い合わせフォーム
          </Link>
          または以下のメールアドレスまでご連絡ください。
        </p>
        <p>メールアドレス: 3.ecassistant@gmail.com</p>
      </LegalSection>

      <LegalSection title="第9条（プライバシーポリシーの変更）">
        <p>
          当社は、必要に応じて本ポリシーの内容を変更することがあります。変更後のプライバシーポリシーは、本サービス上に表示した時点から効力を生じるものとします。
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
