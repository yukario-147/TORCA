// api/_gemini.js
// Gemini API の共通ヘルパー（先頭が _ のファイルは Vercel Functions として公開されない）
//
// モデルは環境変数 GEMINI_MODEL で上書きできる。
// ※ 以前使っていた gemini-2.0-flash-exp / 2.0 系は 2026-06-01 に提供終了（404 になる）。
//   最新の提供状況: https://ai.google.dev/gemini-api/docs/deprecations

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export function geminiConfigured() {
  return !!process.env.GEMINI_API_KEY;
}

// JSON 応答を返すよう指示して Gemini を呼び、パース済みの値を返す（失敗時は null）
export async function generateJson({ system, prompt, timeoutMs = 9000 }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal: controller.signal,
      body: JSON.stringify({
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });
    if (!res.ok) {
      console.error(`Gemini API error (${model}):`, res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const data = await res.json();
    const text = (data.candidates?.[0]?.content?.parts || [])
      .filter(p => !p.thought && typeof p.text === 'string')
      .map(p => p.text)
      .join('');
    return parseJsonLoose(text);
  } catch (err) {
    console.error(err?.name === 'AbortError' ? `Gemini API timeout (${timeoutMs}ms)` : 'Gemini API failed:', err?.message || err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonLoose(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/[[{][\s\S]*[\]}]/);
    if (!m) return null;
    try { return JSON.parse(m[0]); } catch { return null; }
  }
}

// =====================
// 「撮可らしさ」スコアリング（youtube-search.js から使用）
// =====================
const SCORE_SYSTEM = `あなたはアイドルグループ「きゅるりんってしてみて」のファン動画分類アシスタントです。
YouTube 動画リストのそれぞれについて「ファンが撮影したライブ撮可動画」である可能性を 0〜100 でスコアリングしてください。

【判定基準】
- ファンが現地で撮影したライブ映像（縦動画、客席視点、生歌、推し単推し撮りなど）→ 80〜100
- ファンが撮影したオフショット・特典会・出待ち → 60〜80
- ファンの感想動画・現場レポ → 40〜60
- 公式 MV・公式配信・テレビ出演 → 10〜30
- 全く関係ない動画（同名の別人、誤検出など）→ 0〜10

【出力形式】次の JSON 配列のみを返す。説明文は不要。
[{"videoId": "xxx", "score": 85, "reason": "幕張ライブの島村嬉唄の撮可動画"}]`;

export async function scoreVideos(videos) {
  const blank = videos.map(v => ({ ...v, takaScore: null, takaReason: null }));
  if (!geminiConfigured() || videos.length === 0) return blank;

  const list = videos
    .map((v, i) => `${i + 1}. videoId: ${v.videoId}\n   タイトル: ${v.title}\n   チャンネル: ${v.channelTitle}\n   説明: ${(v.description || '').slice(0, 200)}`)
    .join('\n\n');

  const scores = await generateJson({ system: SCORE_SYSTEM, prompt: `【動画リスト】\n${list}` });
  if (!Array.isArray(scores)) return blank;

  const map = new Map();
  for (const s of scores) {
    if (s && typeof s.videoId === 'string' && typeof s.score === 'number') {
      map.set(s.videoId, { takaScore: Math.max(0, Math.min(100, Math.round(s.score))), takaReason: String(s.reason || '').slice(0, 80) });
    }
  }
  return videos
    .map(v => ({ ...v, takaScore: map.get(v.videoId)?.takaScore ?? null, takaReason: map.get(v.videoId)?.takaReason ?? null }))
    .sort((a, b) => (b.takaScore ?? -1) - (a.takaScore ?? -1));
}
