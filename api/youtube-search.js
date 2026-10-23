// api/youtube-search.js
// Vercel Functions - YouTube 並列検索 + Gemini 撮可スコアリング
//
// GET /api/youtube-search?p=<JSON>（推奨）… 成功レスポンスを Vercel CDN でキャッシュし、
//   同じフィード・同じ検索を複数ユーザーで共有して YouTube API クォータ（1日1万ユニット・検索1回100）を節約する。
// POST（JSON ボディ）も後方互換のため受け付ける（こちらは CDN キャッシュされない）。
//
// パラメータ: { userInput, filters: { member, venue, period }, order, channelId }
//
// クォータ対策（api/_guard.js、Upstash 接続時に有効）
// ・結果を Redis に6時間キャッシュ（CDN の地域ごとのキャッシュより確実に共有される）
// ・同じ IP からのキャッシュ外の呼び出しを回数制限
// ・1日の使用ユニットを数え、上限に近づいたら新しい検索を止めて古い結果を返す

import { expandQueries, periodToPublishedAfter, normalizeInput, sanitizeFilters, OFFICIAL_CHANNEL_IDS } from '../src/searchDict.js';
import { scoreVideos, geminiConfigured } from './_gemini.js';
import { LIMITS, rateLimit, reserveBudget, markExhausted, cacheGet, cacheSet, hashKey, sendLimited } from './_guard.js';

const FRESH_MS = 6 * 60 * 60 * 1000;
const CDN_LONG = 'public, s-maxage=21600, stale-while-revalidate=86400'; // 6時間
const CDN_SHORT = 'public, s-maxage=300';
const FEED_QUERIES = 2;   // フィード（入力なし）は2クエリで十分
const SEARCH_QUERIES = 5; // 検索は5クエリ（1回 約500ユニット）

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

function send(res, cacheable, body, cdn) {
  res.setHeader('Cache-Control', cacheable ? cdn : 'no-store');
  return res.status(200).json(body);
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return sendError(res, 500, null, 'YouTube API key not configured');

  const params = readParams(req);
  if (!params) return sendError(res, 400, null, 'invalid parameters');
  const userInput = normalizeInput(params.userInput);
  const filters = sanitizeFilters(params.filters);
  const order = params.order === 'date' ? 'date' : 'relevance';
  const channelId = typeof params.channelId === 'string' && /^UC[\w-]{22}$/.test(params.channelId) ? params.channelId : null;
  const cacheable = req.method === 'GET';
  const isFeed = !!channelId || !userInput;

  // ---- キャッシュ・回数制限・1日の上限 ----
  const cacheKey = `yt:${hashKey({ v: 2, userInput, filters, order, channelId })}`;
  const cached = await cacheGet(cacheKey);
  if (cached?.fresh) return send(res, cacheable, cached.data, CDN_LONG);

  // 制限に当たった時は、古い結果があればそれを返す（画面を空にしない）
  const fallback = (limited) => (cached
    ? send(res, cacheable, { ...cached.data, stale: true }, CDN_SHORT)
    : sendLimited(res, limited));

  const rl = await rateLimit(req, 'yt');
  if (!rl.ok) return fallback({ retryAfter: rl.retryAfter });

  const queries = channelId ? [] : expandQueries(userInput, filters).slice(0, isFeed ? FEED_QUERIES : SEARCH_QUERIES);
  const units = channelId ? 100 : queries.length * 100 + 1;
  const allowed = await reserveBudget('yt', units, isFeed ? LIMITS.ytUnits() : LIMITS.ytSearchUnits());
  if (!allowed) {
    return fallback({ quota: true, message: '本日の YouTube 検索の上限に達しました。明日また試すか、外部アプリで検索してください' });
  }

  // ---- channelId 指定時：公式チャンネルの最新動画フィード（Gemini スコアリング不要） ----
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
      const body = { items };
      if (items.length) await cacheSet(cacheKey, body, { freshMs: FRESH_MS });
      return send(res, cacheable && items.length > 0, body, CDN_LONG);
    } catch (err) {
      console.error('channel feed error:', err.message);
      if (err.quota) await markExhausted('yt');
      if (cached) return send(res, cacheable, { ...cached.data, stale: true }, CDN_SHORT);
      return sendError(res, 502, err, 'channel feed failed');
    }
  }

  // ---- 並列 YouTube 検索 ----
  // userInput・filters がすべて空の場合は expandQueries が
  // 「きゅるして 撮可」系のデフォルトクエリを返す（ホームのフィード取得に使用）
  const publishedAfter = periodToPublishedAfter(filters.period);
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
  if (failed.some(r => r.reason?.quota)) await markExhausted('yt');
  // 全クエリ失敗（クォータ超過など）は「0件」ではなくエラーとして返す（空結果をキャッシュさせない）
  if (failed.length === results.length) {
    if (cached) return send(res, cacheable, { ...cached.data, stale: true }, CDN_SHORT);
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

  if (deduped.length === 0) return send(res, cacheable, { items: [] }, CDN_SHORT);

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

  // きゅるして無関係な動画をサーバー側で排除してから Gemini でスコアリング（Gemini も1日の上限内で）
  const relevant = items.filter(isKyurushiteRelated);
  const canScore = geminiConfigured() && relevant.length > 0 && await reserveBudget('gemini', 1, LIMITS.gemini());
  const scored = canScore
    ? await scoreVideos(relevant)
    : relevant.map(v => ({ ...v, takaScore: null, takaReason: null }));

  // 説明文は絞り込み用に先頭だけ返す（レスポンスと端末キャッシュを軽くする）
  const slim = scored.map(v => ({ ...v, description: Array.from(v.description).slice(0, 300).join('') }));
  const geminiUsed = slim.some(v => typeof v.takaScore === 'number');
  const body = { items: slim, geminiUsed };

  // スコアリングが一時的に失敗した結果は短めにキャッシュ（すぐ再スコアリングされるように）
  const scoredOk = geminiUsed || !geminiConfigured();
  await cacheSet(cacheKey, body, { freshMs: scoredOk ? FRESH_MS : 10 * 60 * 1000 });
  return send(res, cacheable, body, scoredOk ? CDN_LONG : CDN_SHORT);
}
