import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

const CONTACT_TO = "3.ecassistant@gmail.com";
const CONTACT_FROM = "RakuKit お問い合わせ <onboarding@resend.dev>";

const MAX_LENGTH = {
  name: 100,
  email: 200,
  message: 5000,
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません" }, { status: 400 });
  }

  const { name, email, message } = (body ?? {}) as Record<string, unknown>;

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof message !== "string" ||
    !name.trim() ||
    !email.trim() ||
    !message.trim()
  ) {
    return NextResponse.json({ error: "お名前・メールアドレス・お問い合わせ内容を入力してください" }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "メールアドレスの形式が正しくありません" }, { status: 400 });
  }

  if (
    name.length > MAX_LENGTH.name ||
    email.length > MAX_LENGTH.email ||
    message.length > MAX_LENGTH.message
  ) {
    return NextResponse.json({ error: "入力内容が長すぎます" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "メール送信の設定が完了していません（RESEND_API_KEY未設定）" },
      { status: 500 }
    );
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: CONTACT_FROM,
      to: CONTACT_TO,
      replyTo: email,
      subject: `【RakuKit お問い合わせ】${name}様より`,
      text: `お名前: ${name}\nメールアドレス: ${email}\n\n---\n${message}`,
    });

    if (error) {
      return NextResponse.json({ error: "メール送信に失敗しました" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "メール送信に失敗しました" }, { status: 502 });
  }
}
