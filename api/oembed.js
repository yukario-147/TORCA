// api/oembed.js
// Vercel Functions - oEmbed プロキシ
// X / TikTok / YouTube のタイトル・サムネ・埋め込みHTMLをフロントに返す

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { url, platform } = req.query;
  if (!url) return res.status(400).json({ error: 'url is required' });

  // Instagram は oEmbed に認証が必要なためスキップ
  if (platform === 'instagram') {
    return res.status(200).json({ title: null, authorName: null, thumbnailUrl: null, html: null });
  }

  try {
    let oembedUrl;
    if (platform === 'x' || platform === 'twitter') {
      // omit_script=true: blockquote のみ受け取り、widgets.js はフロントで読み込む
      oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true&theme=dark&lang=ja`;
    } else if (platform === 'tiktok') {
      oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    } else if (platform === 'youtube') {
      oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    } else {
      return res.status(400).json({ error: 'Unsupported platform' });
    }

    const response = await fetch(oembedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TORCA/2.0)' },
    });

    if (!response.ok) {
      return res.status(200).json({ title: null, authorName: null, thumbnailUrl: null, html: null });
    }

    const data = await response.json();
    // script タグは返さない（フロントで公式スクリプトを別途読み込む）
    const html = typeof data.html === 'string'
      ? data.html.replace(/<script[\s\S]*?<\/script>/gi, '')
      : null;

    return res.status(200).json({
      title: data.title || null,
      authorName: data.author_name || null,
      thumbnailUrl: data.thumbnail_url || null,
      html,
    });
  } catch (err) {
    console.error('oembed error:', err);
    return res.status(200).json({ title: null, authorName: null, thumbnailUrl: null, html: null });
  }
}
