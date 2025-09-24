import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得して文字エンコーディングを検証
    const rawBody = await request.text();

    // 文字化けチェック: 不正文字を含む場合はエラーを返す
    if (rawBody.includes('�') || /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(rawBody)) {
      console.error('Invalid character encoding detected in request body:', rawBody);
      return NextResponse.json(
        { error: 'リクエストの文字エンコーディングが正しくありません。UTF-8で送信してください。' },
        { status: 400 }
      );
    }

    let parsedData;
    try {
      parsedData = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw body:', rawBody);
      return NextResponse.json(
        { error: 'JSONの形式が正しくありません。' },
        { status: 400 }
      );
    }

    const {
      email,
      inviteLink,
      companyName,
      inviterName,
      role,
      message,
      expiresAt
    } = parsedData;

    if (!email || !inviteLink || !companyName) {
      return NextResponse.json(
        { error: '必要な情報が不足しています' },
        { status: 400 }
      );
    }

    // セキュリティ: 招待リンクの形式を検証
    const urlPattern = /^https?:\/\/[^\/]+\/join\/[a-zA-Z0-9]+$/;
    if (!urlPattern.test(inviteLink)) {
      return NextResponse.json(
        { error: '不正な招待リンクです' },
        { status: 400 }
      );
    }

    // テキスト版メール本文
    const textContent = `
${companyName}に招待されました

${inviterName ? `${inviterName}さんから${companyName}のチームに参加する招待が届きました。` : ''}

${message ? `メッセージ: ${message}` : ''}

参加する役職: ${role}
${expiresAt ? `この招待は${new Date(expiresAt).toLocaleDateString('ja-JP')}まで有効です` : ''}

下記のリンクをクリックしてチームに参加してください：
${inviteLink}

上記のリンクが機能しない場合は、以下のURLをコピーしてブラウザに貼り付けてください：
${inviteLink}

このメールは${companyName}からの招待です。
心当たりがない場合は、このメールを削除してください。

© 2024 Unica製造業務管理システム
    `.trim();

    // 文字化け防止：subject と text を明示的にUTF-8エンコーディング確保
    const emailSubject = `${companyName}への招待`;

    const { data, error } = await resend.emails.send({
      from: 'noreply@resend.dev', // 開発時はこのアドレスを使用
      to: email,
      subject: emailSubject,
      text: textContent,
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
        'Content-Transfer-Encoding': '8bit'
      },
      html: `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${emailSubject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <div style="background: white; width: 60px; height: 60px; border-radius: 12px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 7H11V13H17V11H13V7Z" fill="#3B82F6"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2ZM4 12C4 7.582 7.582 4 12 4C16.418 4 20 7.582 20 12C20 16.418 16.418 20 12 20C7.582 20 4 16.418 4 12Z" fill="#3B82F6"/>
              </svg>
            </div>
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Unica</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">製造業務管理システム</p>
          </div>

          <div style="background: white; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 24px; font-weight: 600;">
              ${companyName}に招待されました
            </h2>

            ${inviterName ? `<p style="color: #6b7280; margin: 0 0 24px; font-size: 16px;">
              ${inviterName}さんから${companyName}のチームに参加する招待が届きました。
            </p>` : ''}

            ${message ? `<div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="margin: 0 0 4px; font-size: 14px; color: #92400e; font-weight: 500;">メッセージ</p>
              <p style="margin: 0; font-size: 14px; color: #451a03; white-space: pre-wrap;">${message}</p>
            </div>` : ''}

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <p style="margin: 0 0 8px; font-size: 14px; color: #64748b; font-weight: 500;">参加する役職</p>
              <p style="margin: 0; font-size: 16px; color: #1e293b; font-weight: 600;">${role}</p>
              ${expiresAt ? `<p style="margin: 8px 0 0; font-size: 12px; color: #ef4444;">
                ⚠️ この招待は${new Date(expiresAt).toLocaleDateString('ja-JP')}まで有効です
              </p>` : ''}
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${inviteLink}"
                 style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3); transition: all 0.2s ease;">
                チームに参加する
              </a>
            </div>

            <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 32px;">
              <p style="color: #9ca3af; font-size: 14px; margin: 0 0 8px;">
                上記のボタンが機能しない場合は、以下のリンクをコピーしてブラウザに貼り付けてください：
              </p>
              <p style="color: #6b7280; font-size: 12px; word-break: break-all; background: #f9fafb; padding: 12px; border-radius: 4px; border: 1px solid #e5e7eb; margin: 0;">
                ${inviteLink}
              </p>
            </div>

            <div style="margin-top: 32px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                このメールは${companyName}からの招待です。<br>
                心当たりがない場合は、このメールを削除してください。
              </p>
            </div>
          </div>

          <div style="text-align: center; margin-top: 20px;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              © 2024 Unica製造業務管理システム
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: 'メール送信に失敗しました', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: data?.id,
      message: 'メールを送信しました'
    });

  } catch (error) {
    console.error('API error:', error);

    // エラーの詳細情報をログに記録
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    return NextResponse.json(
      {
        error: 'サーバーエラーが発生しました',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}