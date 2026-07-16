# signage-ad

学内デジタルサイネージの学生広告活用システム(MVP)。
サークル・個人が動画を申請し、学生会が承認したものをラズパイ+ディスプレイでローテーション表示する。

## 構成

- `/apply` — 申請フォーム(誰でもアクセス可)。動画アップロード時に30秒上限をブラウザ側で自動チェック
- `/admin` — 管理画面(学生会メンバーのみ、Google OAuthでログイン)。承認/却下、同時掲示10件+待機キュー
- `/display` — 表示クライアント(ラズパイのChromiumキオスクモードで開く)。承認済み動画をローテーション再生

## セットアップ

1. 依存関係のインストール
   ```
   npm install
   ```

2. `.env.local.example` を `.env.local` にコピーし、値を埋める
   - Supabaseプロジェクトを作成し、`supabase/schema.sql` をSQL Editorで実行(applicationsテーブル + videosバケットが作成される)
   - Google Cloud ConsoleでOAuthクライアントIDを発行し、`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` に設定
   - `NEXTAUTH_SECRET` は `openssl rand -base64 32` などで生成
   - Resendでドメイン認証を行い、`RESEND_API_KEY` / `RESEND_FROM_EMAIL` を設定

3. ローカル起動
   ```
   npm run dev
   ```

## デプロイ

Vercelにデプロイし、環境変数を同様に設定する。ラズパイの表示クライアントはデプロイ後のURLの `/display` を開く
(手順は [docs/raspberry-pi-setup.md](docs/raspberry-pi-setup.md) を参照)。

## 運用ルール(MVP版)

- 動画尺: 30秒上限
- 同時掲示件数: 10件上限。超過分は先着順の待機キュー
- 掲載基準: 誹謗中傷・政治宗教勧誘・外部企業の営利広告は不可(学生の小規模な創作物販売は許可)
- 却下時は理由を選択式で記録し、申請者へ自動メール通知

詳細はObsidian Vault側の `Projects/signage-ad.md` を参照。
