# バックエンドとの接続

- ログインは `POST /api/auth/connect` に `{ identifier, password }` を送信する。
- 返却されたアプリ用トークンと公開アカウント情報を sessionStorage に保存する。アプリパスワードは保存しない。
- 再読み込み時は `GET /api/account` でトークンを検証する。検証できなければログイン画面から再接続する。
- ログアウトはフロントのトークン削除のみ。バックエンドのセッション失効やペット運用の停止は行わない。

開発時は Vite が `/api` を `http://127.0.0.1:3001` に転送する。別のAPIサーバーを利用する場合は `VITE_API_BASE_URL` を指定し、バックエンドの `FRONTEND_ORIGIN` も合わせる。本番では同一オリジンの `/api` 転送か `VITE_API_BASE_URL` の設定が必要。

## ペットの仮仕様

BlueskyのDIDをキーとして localStorage に1匹だけ保存する。ペットIDもDIDとし、ハンドルの変更によって別ペットとして扱わない。以前の複数匹デモデータは使用しない。

ペット登録・取得・投稿はまだAPIに接続していない。将来は `DemoProvider` のペット取得・保存を置き換える。現在の `/api/bots` は登録時にアプリパスワードを要求し、登録済みプロフィールの取得APIもないため、ログイン後のトークンで登録・取得する契約の整備が必要。

## 確認

```sh
npm run build
npm run lint
node --test tests/auth.test.cjs
```

認証テストはモックのHTTPレスポンスを使用し、実際のBlueskyへのログインや投稿は行わない。
