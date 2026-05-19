// api/youtube-search.js
// Vercel Functions - YouTube 並列検索 + Gemini スコアリング

import { expandQueries, periodToPublishedAfter, OFFICIAL_CHANNEL_IDS } from '../src/searchDict.js';
import { scoreVideos } from './gemini-score.js';

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'YouTube API key not configured' });

  const { userInput = '', filters = {}, order = 'relevance' } = req.body || {};

  if (!userInput && !filters.member && !filters.venue) {
    return res.status(400).json({ error: 'userInput is required' });
  }

  const queries = expandQueries(userInput, filters);
  const publishedAfter = periodToPublishedAfter(filters.period);

  // 並列 YouTube 検索
  const searchResults = await Promise.allSettled(
    queries.map(async (q) => {
      const params = new URLSearchParams({
        part: 'snippet',
        type: 'video',
        q,
        maxResults: '10',
        order: order === 'date' ? 'date' : 'relevance',
        regionCode: 'JP',
        relevanceLanguage: 'ja',
        key: apiKey,
      });
      if (publishedAfter) params.append('publishedAfter', publishedAfter);

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?${params}`
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(JSON.stringify(err));
      }
      return response.json();
    })
  );

  // 成功したクエリの結果を結合（失敗はスキップ）
  const allItems = [];
  for (const result of searchResults) {
    if (result.status === 'fulfilled') {
      allItems.push(...(result.value.items || []));
    } else {
      console.error('YouTube query failed:', result.reason);
    }
  }

  // videoId で重複排除
  const seen = new Set();
  const deduped = [];
  for (const item of allItems) {
    const id = item.id?.videoId;
    if (id && !seen.has(id)) {
      seen.add(id);
      deduped.push(item);
    }
  }

  if (deduped.length === 0) {
    return res.status(200).json({
      items: [],
      totalQueried: queries.length,
      totalDeduplicated: 0,
      geminiUsed: false,
    });
  }

  // /videos エンドポイントで statistics + 全文 description を一括取得
  const videoIds = deduped.map(item => item.id.videoId).join(',');
  const videoDetails = {};
  try {
    const detailParams = new URLSearchParams({
      part: 'snippet,statistics',
      id: videoIds,
      key: apiKey,
    });
    const detailRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${detailParams}`
    );
    if (detailRes.ok) {
      const detailData = await detailRes.json();
      for (const v of detailData.items || []) {
        videoDetails[v.id] = v;
      }
    }
  } catch (err) {
    console.error('Failed to fetch video details:', err);
  }

  // 整形
  const items = deduped.map(item => {
    const vid = item.id.videoId;
    const detail = videoDetails[vid];
    const snippet = detail?.snippet || item.snippet;
    const stats = detail?.statistics || {};

    return {
      videoId: vid,
      title: snippet.title || '',
      description: snippet.description || '',
      channelTitle: snippet.channelTitle || '',
      channelId: snippet.channelId || '',
      thumbnailUrl:
        snippet.thumbnails?.medium?.url ||
        snippet.thumbnails?.default?.url ||
        '',
      publishedAt: snippet.publishedAt || '',
      viewCount: parseInt(stats.viewCount || '0', 10),
      isOfficial: OFFICIAL_CHANNEL_IDS.includes(snippet.channelId || ''),
    };
  });

  // きゅるして無関係な動画をサーバー側で排除
  const relevant = items.filter(isKyurushiteRelated);

  // Gemini でスコアリング
  let scored = relevant;
  let geminiUsed = false;
  try {
    scored = await scoreVideos(relevant);
    geminiUsed = scored.some(v => v.takaScore !== null && v.takaScore !== undefined);
  } catch (err) {
    console.error('Gemini scoring failed:', err);
    scored = relevant.map(v => ({ ...v, takaScore: null, takaReason: null }));
  }

  return res.status(200).json({
    items: scored,
    totalQueried: queries.length,
    totalDeduplicated: deduped.length,
    geminiUsed,
  });
}
