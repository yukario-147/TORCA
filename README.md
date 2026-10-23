# TORCA

「きゅるりんってしてみて」の撮可（撮影可能区間）クリップを探す・観る・アーカイブする非公式ファンアプリ。
React 19 + Vite のフロントエンドと、Vercel Functions（`api/`）で動きます。

## 開発

```bash
npm install
npm run dev      # http://localhost:5173 （/api も Vite の開発サーバー上で動く）
npm run lint
npm run build
```

API キーは `.env.local` に書きます（未設定の機能は「準備中」表示になります）。

| 変数 | 用途 |
| --- | --- |
| `YOUTUBE_API_KEY` | YouTube 検索・ホーム／推しフィード |
| `GEMINI_API_KEY` | 撮可スコアリング・URL アーカイブの AI 自動判定 |
| `GEMINI_MODEL` | 任意。既定は `gemini-3.5-flash-lite` |
| `TAVILY_API_KEY` | X / TikTok / Instagram の横断検索（`BRAVE_API_KEY` でも可） |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Upstash Redis（回数制限・1日の上限・結果キャッシュ）。`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` でも可。未設定なら制限なしで動く |
| `YT_DAILY_UNITS` / `YT_SEARCH_DAILY_UNITS` | 任意。YouTube API の1日の上限（既定 9000 / うち検索 7000 ユニット） |
| `GEMINI_DAILY_LIMIT` / `SNS_DAILY_LIMIT` | 任意。Gemini・SNS 検索の1日の呼び出し上限（既定 500 / 40） |

## 構成

- `src/App.jsx` … アプリシェル（ナビ・推しカラー・オンボーディング）
- `src/index.css` … デザインシステム（白ベース × ホログラムパステル。推しカラーは `--accent` 系変数）
- `src/theme.js` … 推しカラーのパレット・ブレークポイント
- `src/storage.js` … localStorage 永続化（ブックマーク・アーカイブは共有ストア）・共有コード・バックアップ
- `src/*Tab.jsx` … 各画面、`src/player.jsx` / `src/EmbedModal.jsx` … アプリ内再生・埋め込み
- `src/events.js` … ライブ予定（運営が手動で編集。未確認情報は載せない）
- `api/youtube-search.js` … YouTube 検索（GET は Vercel CDN で6時間キャッシュ。フィードは2クエリ・検索は5クエリ）
- `api/sns-search.js` / `api/oembed.js` / `api/ai.js` … SNS 検索・oEmbed・AI 判定
- `api/_gemini.js` … Gemini 共通ヘルパー（`_` 始まりなので公開ルートにはならない）
- `api/_guard.js` … 回数制限・1日の上限・結果キャッシュ（Upstash Redis）
- `vercel.json` … セキュリティヘッダー（CSP など）。`npm run preview` でも同じヘッダーが付く

## API の使いすぎ対策（運用）

YouTube Data API は1日1万ユニット（検索1回100）しかないため、次の4段で守っています。

1. **消費を減らす**（コード）… CDN と Redis で6時間キャッシュ、フィードは2クエリに削減
2. **IP ごとの回数制限**（Vercel ダッシュボード）… Firewall → Configure → New Rule で、Request Path が `/api/` で始まるリクエストに Rate Limit（Fixed Window・60秒・60回・キーは IP・429）を1つ設定
3. **1日の上限ガード**（Upstash）… Vercel の Storage / Marketplace から「Upstash for Redis」を作成してこのプロジェクトに接続し、再デプロイする。上限に近づくと新しい検索を止め、古い結果を返す
4. **Google Cloud 側の上限**… Generative Language API の「1日あたりのリクエスト数」の割り当てを下げ、予算アラートを設定。各 API キーは使う API だけに制限する。YouTube の上限が足りなければ割り当ての引き上げを申請する
