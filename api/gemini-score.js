// api/gemini-score.js
// Gemini 2.0 Flash による「撮可らしさ」スコアリング

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

const PROMPT_PREFIX = `あなたはアイドルグループ「きゅるりんってしてみて」のファン動画分類アシスタントです。

以下の YouTube 動画リストについて、それぞれが「ファンが撮影したライブ撮可動画」である可能性を 0〜100 でスコアリングしてください。

【判定基準】
- ファンが現地で撮影したライブ映像（縦動画、客席視点、生歌、推し単推し撮りなど）→ 80〜100
- ファンが撮影したオフショット・特典会・出待ち → 60〜80
- ファンの感想動画・現場レポ → 40〜60
- 公式 MV・公式配信・テレビ出演 → 10〜30
- 全く関係ない動画（同名の別人、誤検出など）→ 0〜10

【出力形式】
必ず以下の JSON 配列のみを返してください。説明文や前置きは一切不要です。

[
  {"videoId": "xxx", "score": 85, "reason": "幕張ライブの島村嬉唄の撮可動画"},
  {"videoId": "yyy", "score": 15, "reason": "公式 MV"}
]

【動画リスト】
`;

// youtube-search.js から直接呼び出す named export
export async function scoreVideos(videos) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !Array.isArray(videos) || videos.length === 0) {
    return videos;
  }

  const videoList = videos
    .map(
      (v, i) =>
        `${i + 1}. videoId: ${v.videoId}\n   タイトル: ${v.title}\n   チャンネル: ${v.channelTitle}\n   説明: ${(v.description || '').slice(0, 200)}`
    )
    .join('\n\n');

  const prompt = PROMPT_PREFIX + videoList;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('Gemini API error:', response.status, await response.text());
      return videos.map(v => ({ ...v, takaScore: null, takaReason: null }));
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let scores;
    try {
      scores = JSON.parse(text);
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        try { scores = JSON.parse(match[0]); } catch { return videos; }
      } else {
        return videos;
      }
    }

    if (!Array.isArray(scores)) return videos;

    const scoreMap = {};
    for (const s of scores) {
      if (s.videoId) {
        scoreMap[s.videoId] = {
          takaScore: typeof s.score === 'number' ? s.score : null,
          takaReason: s.reason || '',
        };
      }
    }

    const result = videos.map(v => ({
      ...v,
      takaScore: scoreMap[v.videoId]?.takaScore ?? null,
      takaReason: scoreMap[v.videoId]?.takaReason ?? null,
    }));

    // スコア降順ソート
    return result.sort((a, b) => (b.takaScore ?? -1) - (a.takaScore ?? -1));
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.error('Gemini API timeout (8s)');
    } else {
      console.error('Gemini scoring error:', err);
    }
    return videos.map(v => ({ ...v, takaScore: null, takaReason: null }));
  }
}

// Vercel Functions として単体でも動作する default export
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { videos } = req.body || {};
  if (!Array.isArray(videos)) {
    return res.status(400).json({ error: 'videos array required' });
  }

  try {
    const scored = await scoreVideos(videos);
    return res.status(200).json({ items: scored });
  } catch (err) {
    console.error('gemini-score handler error:', err);
    return res.status(500).json({ error: 'Scoring failed' });
  }
}
