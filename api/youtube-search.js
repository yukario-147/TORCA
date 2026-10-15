// api/youtube-search.js
// Vercel Functions - YouTube 並列検索 + Gemini 撮可スコアリング
//
// GET /api/youtube-search?p=<JSON>（推奨）… 成功レスポンスを Vercel CDN でキャッシュし、
//   同じフィード・同じ検索を複数ユーザーで共有して YouTube API クォータ（1日1万ユニット・検索1回100）を節約する。
// POST（JSON ボディ）も後方互換のため受け付ける（こちらは CDN キャッシュされない）。
//
// パラメータ: { userInput, filters: { member, venue, period }, order, channelId }

import { expandQueries, periodToPublishedAfter, OFFICIAL_CHANNEL_IDS } from '../src/searchDict.js';
import { scoreVideos, geminiConfigured } from './_gemini.js';

const CACHE_OK = 'public, s-maxage=1800, stale-while-revalidate=86400';

// きゅるりんってしてみてに関連するキーワード一覧（どれか1つでも含まれれば関連動画と判定）
const KYURUSHITE_TERMS = [
  'きゅるりんってしてみて', 'きゅるして', 'kyurushite', 'kyururin',
  '島村嬉唄', 'うたちゃん', 'うちゃたん', 'しまむらうた',
  '環やね', 'やねちゃん', 'やねぴ', 'たまきやね',
  'チバゆな', 'ゆなちゃん',
  '逃げ水あむ', 'あむちゃん', 'あむち', 'にげみずあむ',
  'ディアステージ', 'dearstage',
];

function isKyurushiteRelated(item) {
  if (item.isOfficial) return true;
  const text = `${item.title} ${item.description} ${item.channelTitle}`.toLowerCase();
  return KYURUSHITE_TERMS.some(kw => text.includes(kw.toLowerCase()));
}

function readParams(req) {
  if (req.method === 'GET') {
    try { return JSON.parse(req.query?.p || '{}'); } catch { return null; }
  }
  return req.body && typeof req.body === 'object' ? req.body : {};
}

const thumbOf = (snippet) => snippet?.thumbnails?.medium?.url || snippet?.thumbnails?.default?.url || '';

async function ytFetch(endpoint, params) {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${new URLSearchParams(params)}`);
  if (!res.ok) {
    let reason = '';
    try { reason = (await res.json())?.error?.errors?.[0]?.reason || ''; } catch { /* 無視 */ }
    const err = new Error(`YouTube ${endpoint} ${res.status} ${reason}`);
    err.quota = /quota|rateLimit/i.test(reason);
    throw err;
  }
  return res.json();
}

function sendError(res, status, err, message) {
  res.setHeader('Cache-Control', 'no-store');
  const quota = !!err?.quota;
  return res.status(quota ? 503 : status).json({
    error: quota ? 'quota-exceeded' : 'youtube-search-failed',
    quota,
    message: quota ? 'YouTube API の本日の上限に達しました' : message,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return sendError(res, 500, null, 'YouTube API key not configured');

  const params = readParams(req);
  if (!params) return sendError(res, 400, null, 'invalid parameters');
  const userInput = typeof params.userInput === 'string' ? params.userInput.slice(0, 100) : '';
  const filters = params.filters && typeof params.filters === 'object' ? params.filters : {};
  const order = params.order === 'date' ? 'date' : 'relevance';
  const channelId = typeof params.channelId === 'string' && /^UC[\w-]{22}$/.test(params.channelId) ? params.channelId : null;
  const cacheable = req.method === 'GET';

  // channelId 指定時：公式チャンネルの最新動画フィード（Gemini スコアリング不要）
  if (channelId) {
    try {
      const data = await ytFetch('search', { part: 'snippet', type: 'video', channelId, maxResults: '10', order: 'date', key: apiKey });
      const items = (data.items || []).map(item => ({
        videoId: item.id?.videoId,
        title: item.snippet?.title || '',
        description: item.snippet?.description || '',
        channelTitle: item.snippet?.channelTitle || '',
        channelId: item.snippet?.channelId || '',
        thumbnailUrl: thumbOf(item.snippet),
        publishedAt: item.snippet?.publishedAt || '',
        viewCount: 0,
        isOfficial: true,
        takaScore: null,
        takaReason: null,
      })).filter(v => v.videoId);
      if (cacheable && items.length) res.setHeader('Cache-Control', CACHE_OK);
      return res.status(200).json({ items });
    } catch (err) {
      console.error('channel feed error:', err.message);
      return sendError(res, 502, err, 'channel feed failed');
    }
  }

  // userInput・filters がすべて空の場合は expandQueries が
  // 「きゅるして 撮可」系のデフォルトクエリを返す（ホームのフィード取得に使用）
  const queries = expandQueries(userInput, filters);
  const publishedAfter = periodToPublishedAfter(filters.period);

  // 並列 YouTube 検索
  const results = await Promise.allSettled(queries.map(q => ytFetch('search', {
    part: 'snippet',
    type: 'video',
    q,
    maxResults: '10',
    order,
    regionCode: 'JP',
    relevanceLanguage: 'ja',
    key: apiKey,
    ...(publishedAfter ? { publishedAfter } : {}),
  })));

  const failed = results.filter(r => r.status === 'rejected');
  failed.forEach(r => console.error('YouTube query failed:', r.reason?.message));
  // 全クエリ失敗（クォータ超過など）は「0件」ではなくエラーとして返す（空結果をキャッシュさせない）
  if (failed.length === results.length) {
    return sendError(res, 502, failed.find(r => r.reason?.quota)?.reason || failed[0]?.reason, 'YouTube search failed');
  }

  // videoId で重複排除
  const seen = new Set();
  const deduped = [];
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const item of r.value.items || []) {
      const id = item.id?.videoId;
      if (id && !seen.has(id)) {
        seen.add(id);
        deduped.push(item);
      }
    }
  }

  if (deduped.length === 0) {
    if (cacheable) res.setHeader('Cache-Control', 'public, s-maxage=300');
    return res.status(200).json({ items: [] });
  }

  // /videos エンドポイントで statistics + 全文 description を一括取得（1ユニット）
  const details = {};
  try {
    const data = await ytFetch('videos', { part: 'snippet,statistics', id: deduped.map(i => i.id.videoId).join(','), key: apiKey });
    for (const v of data.items || []) details[v.id] = v;
  } catch (err) {
    console.error('Failed to fetch video details:', err.message);
  }

  const items = deduped.map(item => {
    const vid = item.id.videoId;
    const snippet = details[vid]?.snippet || item.snippet || {};
    const stats = details[vid]?.statistics || {};
    return {
      videoId: vid,
      title: snippet.title || '',
      description: snippet.description || '',
      channelTitle: snippet.channelTitle || '',
      channelId: snippet.channelId || '',
      thumbnailUrl: thumbOf(snippet),
      publishedAt: snippet.publishedAt || '',
      viewCount: parseInt(stats.viewCount || '0', 10),
      isOfficial: OFFICIAL_CHANNEL_IDS.includes(snippet.channelId || ''),
    };
  });

  // きゅるして無関係な動画をサーバー側で排除してから Gemini でスコアリング
  const scored = await scoreVideos(items.filter(isKyurushiteRelated));

  // 説明文は絞り込み用に先頭だけ返す（レスポンスと端末キャッシュを軽くする）
  const slim = scored.map(v => ({ ...v, description: Array.from(v.description).slice(0, 300).join('') }));

  const geminiUsed = slim.some(v => typeof v.takaScore === 'number');
  // スコアリングが一時的に失敗した結果は短めにキャッシュ（すぐ再スコアリングされるように）
  if (cacheable) res.setHeader('Cache-Control', geminiUsed || !geminiConfigured() ? CACHE_OK : 'public, s-maxage=300');
  return res.status(200).json({ items: slim, geminiUsed });
}
