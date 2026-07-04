// src/useFeed.js
// /api/youtube-search から実データフィードを取得するフック
// localStorage に TTL 付きでキャッシュし、YouTube API クォータを節約する

import { useState, useEffect } from 'react';

const DEFAULT_TTL = 60 * 60 * 1000; // 1時間
const CACHE_PREFIX = 'torca_feed_';

// React StrictMode の二重実行や複数コンポーネントの同時利用で
// 同じフィードを二重フェッチしないよう、進行中のリクエストを共有する
const inflight = {};

function readCache(cacheKey, ttl) {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_PREFIX + cacheKey));
    if (!raw || !Array.isArray(raw.items)) return null;
    if (Date.now() - raw.at > ttl) return null;
    return raw.items;
  } catch {
    return null;
  }
}

function writeCache(cacheKey, items) {
  try {
    localStorage.setItem(CACHE_PREFIX + cacheKey, JSON.stringify({ at: Date.now(), items }));
  } catch { /* 容量超過は無視 */ }
}

function initState(cacheKey, ttl, enabled) {
  const cached = enabled ? readCache(cacheKey, ttl) : null;
  return { items: cached || [], loading: enabled && !cached, error: null };
}

export function useYouTubeFeed(cacheKey, body, { ttl = DEFAULT_TTL, enabled = true } = {}) {
  const [state, setState] = useState(() => initState(cacheKey, ttl, enabled));

  // キーが変わったらキャッシュを読み直す（レンダー中の状態リセットパターン）
  const [prevKey, setPrevKey] = useState(cacheKey);
  if (prevKey !== cacheKey) {
    setPrevKey(cacheKey);
    setState(initState(cacheKey, ttl, enabled));
  }

  const bodyKey = JSON.stringify(body);

  useEffect(() => {
    if (!enabled) return;
    if (readCache(cacheKey, ttl)) return; // キャッシュ済みなら initState が反映している

    let alive = true;

    if (!inflight[cacheKey]) {
      inflight[cacheKey] = fetch('/api/youtube-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyKey,
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'feed fetch failed');
          return data.items || [];
        })
        .finally(() => { delete inflight[cacheKey]; });
    }

    inflight[cacheKey]
      .then((items) => {
        writeCache(cacheKey, items);
        if (alive) setState({ items, loading: false, error: null });
      })
      .catch((err) => {
        if (alive) setState({ items: [], loading: false, error: err.message || 'failed' });
      });

    return () => { alive = false; };
  }, [cacheKey, bodyKey, ttl, enabled]);

  return state;
}
