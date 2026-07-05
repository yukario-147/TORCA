// api/sns-search.js
// Vercel Functions - X / TikTok / Instagram の投稿を検索 API で発見する
//
// X・TikTok は検索 API を無料開放していないため、外部検索エンジンの API で
// サイト内検索を行い、ヒットした投稿 URL をアプリ内埋め込みで表示する。
//
// 対応プロバイダ（上から順に、設定されているものを使用）：
//   1. Tavily     … TAVILY_API_KEY   （https://app.tavily.com/ 無料 1,000回/月・カード不要）
//   2. Brave      … BRAVE_API_KEY    （https://api.search.brave.com/ 無料 2,000回/月）
//   3. Google CSE … GOOGLE_CSE_CX + GOOGLE_CSE_KEY
//                   （※新規プロジェクトへの提供終了。既存アクセス保有者のみ）

import { MEMBER_ALIASES } from '../src/searchDict.js';

const PLATFORM_RULES = {
  x: {
    site: 'x.com',
    hint: 'inurl:status',
    postPattern: /(?:x|twitter)\.com\/[^/]+\/status(?:es)?\/\d+/,
  },
  tiktok: {
    site: 'tiktok.com',
    hint: 'inurl:video',
    postPattern: /tiktok\.com\/@[^/]+\/video\/\d+/,
  },
  instagram: {
    site: 'instagram.com',
    hint: '(inurl:reel OR inurl:p)',
    postPattern: /instagram\.com\/(?:[^/]+\/)?(?:p|reel|reels|tv)\/[\w-]+/,
  },
};

// 投稿 URL から投稿者名を推定
function authorFromUrl(platform, url) {
  if (platform === 'x') {
    const m = url.match(/(?:x|twitter)\.com\/([^/]+)\/status/);
    return m && m[1] !== 'i' ? '@' + m[1] : null;
  }
  if (platform === 'tiktok') {
    const m = url.match(/tiktok\.com\/(@[^/]+)\//);
    return m ? m[1] : null;
  }
  return null;
}

// 検索トピックの組み立て（メンバー名 + 入力 + グループ名で絞り込み）
function buildTopic(userInput, filters) {
  const memberName = filters.member && filters.member !== 'all'
    ? (MEMBER_ALIASES[filters.member]?.[0] || filters.member)
    : '';
  const input = (userInput || '').trim();
  const topic = [memberName, input].filter(Boolean).join(' ');
  const groupTerm = topic.includes('きゅるして') || topic.includes('きゅるりん')
    ? '' : 'きゅるして';
  return [topic || '撮可', groupTerm].filter(Boolean).join(' ');
}

// 結果を共通形式に整形（投稿 URL のみ・重複排除）
function normalize(platform, rawItems) {
  const rule = PLATFORM_RULES[platform];
  const seen = new Set();
  return rawItems
    .filter(item => rule.postPattern.test(item.url || ''))
    .map(item => {
      const url = item.url.replace(/^http:/, 'https:').replace(/twitter\.com/, 'x.com');
      return {
        url,
        platform,
        title: (item.title || '').replace(/\s*[|｜-]\s*(X|TikTok|Instagram).*$/i, '').trim() || item.title || url,
        snippet: (item.snippet || '').slice(0, 160),
        thumbnailUrl: item.thumbnailUrl || null,
        authorName: authorFromUrl(platform, url) || null,
      };
    })
    .filter(item => {
      const k = item.url.split('?')[0];
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

// ---------- プロバイダ実装 ----------

async function searchTavily(platform, topic) {
  const rule = PLATFORM_RULES[platform];
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query: `${topic} 撮可 OR 推しカメラ OR ライブ`,
      include_domains: [rule.site],
      max_results: 10,
      search_depth: 'basic',
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`tavily:${res.status}:${(data?.detail?.error || data?.error || JSON.stringify(data)).slice ? (data?.detail?.error || data?.error || JSON.stringify(data)).slice(0, 120) : res.status}`);
  }
  return (data.results || []).map(r => ({
    url: r.url, title: r.title, snippet: r.content, thumbnailUrl: null,
  }));
}

async function searchBrave(platform, topic) {
  const rule = PLATFORM_RULES[platform];
  const params = new URLSearchParams({
    q: `site:${rule.site} ${rule.hint} ${topic}`,
    count: '10',
    country: 'jp',
    search_lang: 'ja',
  });
  const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: { Accept: 'application/json', 'X-Subscription-Token': process.env.BRAVE_API_KEY },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`brave:${res.status}`);
  return (data.web?.results || []).map(r => ({
    url: r.url, title: r.title, snippet: r.description,
    thumbnailUrl: r.thumbnail?.src || null,
  }));
}

async function searchGoogleCse(platform, topic) {
  const rule = PLATFORM_RULES[platform];
  const key = process.env.GOOGLE_CSE_KEY || process.env.YOUTUBE_API_KEY;
  const params = new URLSearchParams({
    key, cx: process.env.GOOGLE_CSE_CX,
    q: `${rule.hint} ${topic}`,
    num: '10', lr: 'lang_ja', safe: 'active',
    siteSearch: rule.site, siteSearchFilter: 'i',
  });
  const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(`cse:${res.status}:${data?.error?.message?.slice(0, 100) || ''}`);
  return (data.items || []).map(item => ({
    url: item.link, title: item.title, snippet: item.snippet,
    thumbnailUrl: item.pagemap?.cse_thumbnail?.[0]?.src || item.pagemap?.cse_image?.[0]?.src || item.pagemap?.metatags?.[0]?.['og:image'] || null,
  }));
}

// ---------- ハンドラ ----------

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { platform, userInput = '', filters = {} } = req.body || {};
  if (!PLATFORM_RULES[platform]) return res.status(400).json({ error: 'unsupported platform' });

  const provider = process.env.TAVILY_API_KEY ? 'tavily'
    : process.env.BRAVE_API_KEY ? 'brave'
    : (process.env.GOOGLE_CSE_CX && (process.env.GOOGLE_CSE_KEY || process.env.YOUTUBE_API_KEY)) ? 'google-cse'
    : null;

  if (!provider) {
    return res.status(501).json({
      error: 'sns-search-not-configured',
      message: 'TAVILY_API_KEY（推奨・無料）を Vercel の環境変数に設定してください',
    });
  }

  const topic = buildTopic(userInput, filters);

  try {
    const raw = provider === 'tavily' ? await searchTavily(platform, topic)
      : provider === 'brave' ? await searchBrave(platform, topic)
      : await searchGoogleCse(platform, topic);

    const items = normalize(platform, raw);
    return res.status(200).json({ items, provider, query: topic });
  } catch (err) {
    console.error('sns-search error:', err);
    const msg = String(err.message || '');
    const quota = msg.includes('429') || /quota|limit/i.test(msg);
    return res.status(502).json({
      error: 'sns-search-failed',
      provider,
      message: quota
        ? '検索回数の上限に達しました（時間をおいて再度お試しください）'
        : `検索プロバイダでエラーが発生しました (${msg.slice(0, 80)})`,
    });
  }
}
