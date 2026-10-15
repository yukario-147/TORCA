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

## 構成

- `src/App.jsx` … アプリシェル（ナビ・推しカラー・オンボーディング）
- `src/index.css` … デザインシステム（白ベース × ホログラムパステル。推しカラーは `--accent` 系変数）
- `src/theme.js` … 推しカラーのパレット・ブレークポイント
- `src/storage.js` … localStorage 永続化（ブックマーク・アーカイブは共有ストア）・共有コード・バックアップ
- `src/*Tab.jsx` … 各画面、`src/player.jsx` / `src/EmbedModal.jsx` … アプリ内再生・埋め込み
- `src/events.js` … ライブ予定（運営が手動で編集。未確認情報は載せない）
- `api/youtube-search.js` … YouTube 検索（GET は Vercel CDN で30分キャッシュしてクォータを節約）
- `api/sns-search.js` / `api/oembed.js` / `api/ai.js` … SNS 検索・oEmbed・AI 判定
- `api/_gemini.js` … Gemini 共通ヘルパー（`_` 始まりなので公開ルートにはならない）
