// api/oembed.js
// Vercel Functions - oEmbed プロキシ
// X / TikTok / YouTube のタイトル・サムネ・埋め込み情報をフロントに返す
// ・X は oEmbed が title を返さないため、埋め込み HTML からポスト本文を抽出してタイトルにする
// ・TikTok は短縮 URL（vt.tiktok.com / tiktok.com/t/）をリダイレクト解決し、動画 ID も返す

const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; TORCA/3.0)' };

const PLATFORM_HOSTS = {
  x: ['x.com', 'twitter.com'],
  twitter: ['x.com', 'twitter.com'],
  tiktok: ['tiktok.com'],
  youtube: ['youtube.com', 'youtu.be'],
  instagram: ['instagram.com'],
};

// URL のホストがプラットフォームのドメインか検証（任意 URL へのサーバー側リクエストを防ぐ）
function isPlatformUrl(platform, url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const host = u.hostname.toLowerCase();
    return (PLATFORM_HOSTS[platform] || []).some(d => host === d || host.endsWith('.' + d));
  } catch {
    return false;
  }
}

// HTML エンティティの最低限のデコード
function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&mdash;/g, '—').replace(/&hellip;/g, '…').replace(/&nbsp;/g, ' ');
}

// 絵文字（サロゲートペア）を途中で切らずに文字数で切り詰める
export function clip(s, max) {
  const chars = Array.from(s || '');
  return chars.length > max ? chars.slice(0, max).join('') + '…' : chars.join('');
}

// X の埋め込み blockquote からポスト本文を抽出
function tweetTextFromHtml(html) {
  const m = (html || '').match(/<p[^>]*>([\s\S]*?)<\/p>/);
  if (!m) return null;
  const text = decodeEntities(
    m[1].replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')
  ).replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return clip(text, 100);
}

// TikTok の短縮 URL を実 URL に解決（解決先も TikTok のドメインの場合のみ採用）
async function resolveTikTokUrl(url, signal) {
  let u;
  try { u = new URL(url); } catch { return url; }
  const host = u.hostname;
  const isShort = host === 'vt.tiktok.com' || host === 'vm.tiktok.com'
    || (/^(www\.)?tiktok\.com$/.test(host) && u.pathname.startsWith('/t/'));
  if (!isShort) return url;
  try {
    const r = await fetch(url, { redirect: 'follow', headers: UA, signal });
    return r.url && isPlatformUrl('tiktok', r.url) ? r.url : url;
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
// 未対応プラットフォーム・不正 URL は null
export async function fetchOembed(platform, url, { timeoutMs = 8000 } = {}) {
  if (!PLATFORM_HOSTS[platform] || !isPlatformUrl(platform, url)) return null;
  // Instagram は oEmbed に認証が必要なためスキップ
  if (platform === 'instagram') return { ...EMPTY };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let oembedUrl;
    let resolvedUrl = url;

    if (platform === 'x' || platform === 'twitter') {
      oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true&lang=ja`;
    } else if (platform === 'tiktok') {
      resolvedUrl = await resolveTikTokUrl(url, controller.signal);
      oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(resolvedUrl)}`;
    } else {
      oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    }

    const response = await fetch(oembedUrl, { headers: UA, signal: controller.signal });
    if (!response.ok) {
      return { ...EMPTY, resolvedUrl: resolvedUrl !== url ? resolvedUrl : null };
    }

    const data = await response.json();
    // script タグは返さない
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
      thumbnailUrl: typeof data.thumbnail_url === 'string' && data.thumbnail_url.startsWith('https://') ? data.thumbnail_url : null,
      html,
      videoId,
      resolvedUrl: resolvedUrl !== url ? resolvedUrl : null,
    };
  } catch (err) {
    if (err?.name !== 'AbortError') console.error('oembed fetch error:', err?.message || err);
    return { ...EMPTY };
  } finally {
    clearTimeout(timeoutId);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { url, platform } = req.query || {};
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url is required' });

  const result = await fetchOembed(platform, url);
  if (result === null) return res.status(400).json({ error: 'Unsupported platform or url' });

  // フロントでは埋め込み HTML を使わないので返さない
  const rest = { ...result };
  delete rest.html;
  res.setHeader('Cache-Control', rest.title || rest.videoId ? 'public, s-maxage=86400, stale-while-revalidate=604800' : 'no-store');
  return res.status(200).json(rest);
}
