// api/oembed.js
// Vercel Functions - oEmbed プロキシ
// X / TikTok / YouTube のタイトル・サムネ・埋め込み情報をフロントに返す
// ・X は oEmbed が title を返さないため、埋め込み HTML からポスト本文を抽出してタイトルにする
// ・TikTok は短縮 URL（vt.tiktok.com / tiktok.com/t/）をリダイレクト解決し、動画 ID も返す

const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; TORCA/2.2)' };

// HTML エンティティの最低限のデコード
function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(n))
    .replace(/&mdash;/g, '—').replace(/&hellip;/g, '…').replace(/&nbsp;/g, ' ');
}

// X の埋め込み blockquote からポスト本文を抽出
function tweetTextFromHtml(html) {
  const m = (html || '').match(/<p[^>]*>([\s\S]*?)<\/p>/);
  if (!m) return null;
  const text = decodeEntities(
    m[1].replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')
  ).replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.length > 100 ? text.slice(0, 100) + '…' : text;
}

// TikTok の短縮 URL を実 URL に解決
async function resolveTikTokUrl(url) {
  if (!/vt\.tiktok\.com|tiktok\.com\/t\//.test(url)) return url;
  try {
    const r = await fetch(url, { redirect: 'follow', headers: UA });
    return r.url || url;
  } catch {
    return url;
  }
}

function tiktokIdFromUrl(url) {
  const m = (url || '').match(/\/video\/(\d+)/);
  return m ? m[1] : null;
}

const EMPTY = { title: null, authorName: null, thumbnailUrl: null, html: null, videoId: null, resolvedUrl: null };

// oEmbed 情報の取得コア。api/sns-search.js の検索結果補強からも共用する
export async function fetchOembed(platform, url, { timeoutMs = 8000 } = {}) {
  // Instagram は oEmbed に認証が必要なためスキップ
  if (platform === 'instagram') return { ...EMPTY };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let oembedUrl;
    let resolvedUrl = url;

    if (platform === 'x' || platform === 'twitter') {
      // omit_script=true: blockquote のみ受け取り、widgets.js はフロントで読み込む
      oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true&theme=dark&lang=ja`;
    } else if (platform === 'tiktok') {
      resolvedUrl = await resolveTikTokUrl(url);
      oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(resolvedUrl)}`;
    } else if (platform === 'youtube') {
      oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    } else {
      return null;
    }

    const response = await fetch(oembedUrl, { headers: UA, signal: controller.signal });
    if (!response.ok) {
      return { ...EMPTY, resolvedUrl: resolvedUrl !== url ? resolvedUrl : null };
    }

    const data = await response.json();
    // script タグは返さない（フロントで公式スクリプトを別途読み込む）
    const html = typeof data.html === 'string'
      ? data.html.replace(/<script[\s\S]*?<\/script>/gi, '')
      : null;

    // タイトル：X はポスト本文を抽出、それ以外は oEmbed の title
    let title = data.title || null;
    if ((platform === 'x' || platform === 'twitter') && !title) {
      title = tweetTextFromHtml(html);
    }

    // TikTok の動画 ID（解決済み URL → embed_product_id → html の data-video-id の順）
    let videoId = null;
    if (platform === 'tiktok') {
      videoId = tiktokIdFromUrl(resolvedUrl)
        || (data.embed_product_id ? String(data.embed_product_id) : null)
        || (html?.match(/data-video-id="(\d+)"/)?.[1] ?? null);
    }

    return {
      title,
      authorName: data.author_name || null,
      thumbnailUrl: data.thumbnail_url || null,
      html,
      videoId,
      resolvedUrl: resolvedUrl !== url ? resolvedUrl : null,
    };
  } catch (err) {
    if (err?.name !== 'AbortError') console.error('oembed fetch error:', err);
    return { ...EMPTY };
  } finally {
    clearTimeout(timeoutId);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { url, platform } = req.query;
  if (!url) return res.status(400).json({ error: 'url is required' });

  const result = await fetchOembed(platform, url);
  if (result === null) return res.status(400).json({ error: 'Unsupported platform' });
  return res.status(200).json(result);
}
