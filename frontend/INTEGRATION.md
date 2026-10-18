# バックエンドとの接続

- ログインは `POST /api/auth/connect` に `{ identifier, password }` を送信する。
- 返却されたアプリ用トークンと公開アカウント情報を sessionStorage に保存する。アプリパスワードは保存しない。
- 再読み込み時は `GET /api/account` でトークンを検証する。検証できなければログイン画面から再接続する。
- ログアウトはフロントのトークン削除のみ。バックエンドのセッション失効やペット運用の停止は行わない。

開発時は Vite が `/api` を `http://127.0.0.1:3001` に転送する。別のAPIサーバーを利用する場合は `VITE_API_BASE_URL` を指定し、バックエンドの `FRONTEND_ORIGIN` も合わせる。本番では同一オリジンの `/api` 転送か `VITE_API_BASE_URL` の設定が必要。

## ペット登録・取得

- 作成は `POST /api/bots` にアプリ用Bearerトークンと `{ bot: { name, personality, interests } }` を送る。
- バックエンドがログイン済みアカウントの認証情報を使い、PDSの `com.nyuun.peta.profile/self` に設定を作成する。ブラウザからパスワードを再送しない。
- 運用用セッションは `bot_accounts` に暗号化して保存する。DIDごとに1匹で、重複作成は409になる。
- `GET /api/bots/me` は同じBearerトークンで自分の登録済みペットを取得する。未登録は `{ bot: null }`、取得失敗はエラーで返す。
- ログイン・再読み込み時にプロフィールを取得し、マイページを復元する。以前のlocalStorageの仮ペットは参照しない。
- 作成成功は登録完了を表し、自動投稿開始や初回投稿の成功を保証するものではない。
- 従来の認証情報を同時送信する登録APIと `/api/pets` は互換性のため残している。今回のフロントはログイン済み `/api/bots` 経路を利用する。

## 確認

```sh
npm run build
npm run lint
node --test tests/*.test.cjs
```

フロントのテストはモックのHTTPレスポンスを使用する。バックエンドは `backend/` で `node --import tsx --test tests/account-bots.test.ts` を実行する。実際のBlueskyへのログインや投稿は行わない。
