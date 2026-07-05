// api/sns-search.js
// Vercel Functions - X / TikTok / Instagram の投稿を Google Programmable Search（公式API）で検索する
//
// X・TikTok は検索 API を無料開放していないため、Google のインデックスを
// site: 検索で引き、ヒットした投稿 URL をアプリ内埋め込み（oEmbed / 公式 iframe）で表示する。
//
// 必要な環境変数：
//   GOOGLE_CSE_CX  … Programmable Search Engine の検索エンジン ID（cx）
//                    https://programmablesearchengine.google.com/ で作成。
//                    「検索するサイト」に x.com/* ・ *.tiktok.com/* ・ *.instagram.com/* を登録する
//                    （「ウェブ全体を検索」は不要。サイト指定型エンジンで動作する）
//   GOOGLE_CSE_KEY … Custom Search API を有効化した API キー
//                    （未設定なら YOUTUBE_API_KEY を流用。同じ Google Cloud プロジェクトで
//                      「Custom Search API」を有効にしておくこと）
//
// サイト絞り込みは q の site: 演算子ではなく siteSearch パラメータで行うため、
// エンジンが「特定サイト型」でも「ウェブ全体型」でも同じように動く。

import { MEMBER_ALIASES } from '../src/searchDict.js';

const PLATFORM_RULES = {
  x: {
    site: 'x.com',
    extra: 'inurl:status',
    postPattern: /x\.com\/[^/]+\/status(?:es)?\/\d+/,
  },
  tiktok: {
    site: 'tiktok.com',
    extra: 'inurl:video',
    postPattern: /tiktok\.com\/@[^/]+\/video\/\d+/,
  },
  instagram: {
    site: 'instagram.com',
    extra: '(inurl:reel OR inurl:p)',
    postPattern: /instagram\.com\/(?:p|reel|reels|tv)\/[\w-]+/,
  },
};

function periodToDateRestrict(period) {
  if (period === 'week') return 'd7';
  if (period === 'month') return 'm1';
  return null;
}

// 投稿 URL から投稿者名を推定
function authorFromUrl(platform, url) {
  if (platform === 'x') {
    const m = url.match(/x\.com\/([^/]+)\/status/);
    return m && m[1] !== 'i' ? '@' + m[1] : null;
  }
  if (platform === 'tiktok') {
    const m = url.match(/tiktok\.com\/(@[^/]+)\//);
    return m ? m[1] : null;
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const cx = process.env.GOOGLE_CSE_CX;
  const key = process.env.GOOGLE_CSE_KEY || process.env.YOUTUBE_API_KEY;
  if (!cx || !key) {
    return res.status(501).json({
      error: 'sns-search-not-configured',
      message: 'GOOGLE_CSE_CX（と必要なら GOOGLE_CSE_KEY）を Vercel の環境変数に設定してください',
    });
  }

  const { platform, userInput = '', filters = {} } = req.body || {};
  const rule = PLATFORM_RULES[platform];
  if (!rule) return res.status(400).json({ error: 'unsupported platform' });

  // クエリ組み立て：site: + 投稿URL形式 + メンバー名 + 入力 + グループ名
  const memberName = filters.member && filters.member !== 'all'
    ? (MEMBER_ALIASES[filters.member]?.[0] || filters.member)
    : '';
  const input = (userInput || '').trim();
  const topic = [memberName, input].filter(Boolean).join(' ');
  const q = [
    rule.extra,
    topic || '撮可',
    // グループ名で必ず絞る（無関係な投稿を除外）
    topic.includes('きゅるして') || topic.includes('きゅるりん') ? '' : '(きゅるして OR きゅるりんってしてみて)',
  ].filter(Boolean).join(' ');

  const params = new URLSearchParams({
    key, cx, q,
    num: '10',
    lr: 'lang_ja',
    safe: 'active',
    // プラットフォームのサイト内に限定（エンジン設定に依存しない）
    siteSearch: rule.site,
    siteSearchFilter: 'i',
  });
  const dateRestrict = periodToDateRestrict(filters.period);
  if (dateRestrict) params.append('dateRestrict', dateRestrict);

  try {
    const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
    const data = await response.json();

    if (!response.ok) {
      const reason = data?.error?.errors?.[0]?.reason || data?.error?.status || 'unknown';
      // クォータ超過やキー不備を判別できるメッセージで返す
      return res.status(502).json({ error: 'cse-error', reason, message: data?.error?.message || 'Google検索APIエラー' });
    }

    const seen = new Set();
    const items = (data.items || [])
      .filter(item => rule.postPattern.test(item.link || ''))
      .map(item => {
        const url = item.link.replace(/^http:/, 'https:');
        const meta = item.pagemap?.metatags?.[0] || {};
        return {
          url,
          platform,
          title: (item.title || '').replace(/\s*[|｜-]\s*(X|TikTok|Instagram).*$/i, '').trim() || item.title || url,
          snippet: item.snippet || meta['og:description'] || '',
          thumbnailUrl:
            item.pagemap?.cse_thumbnail?.[0]?.src ||
            item.pagemap?.cse_image?.[0]?.src ||
            meta['og:image'] || null,
          authorName: authorFromUrl(platform, url) || meta['og:site_name'] || null,
        };
      })
      .filter(item => {
        const k = item.url.split('?')[0];
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

    return res.status(200).json({
      items,
      totalResults: parseInt(data.searchInformation?.totalResults || '0', 10),
      query: q,
    });
  } catch (err) {
    console.error('sns-search error:', err);
    return res.status(500).json({ error: 'sns-search failed' });
  }
}
