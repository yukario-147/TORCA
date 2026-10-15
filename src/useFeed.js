// src/useFeed.js
// /api/youtube-search から実データフィードを取得するフック
// ・GET リクエストにして Vercel CDN でユーザー間キャッシュ（YouTube API クォータ節約）
// ・端末側でも localStorage に TTL 付きでキャッシュ

import { useState, useEffect, useCallback } from 'react';

const DEFAULT_TTL = 60 * 60 * 1000; // 1時間
const CACHE_PREFIX = 'torca_feed_';
const ERROR_COOLDOWN = 30 * 1000; // 失敗直後に同じフィードを連打しない

// /api/youtube-search を呼ぶ共通関数（SearchTab からも使用）
export async function fetchYouTubeSearch(body, { signal } = {}) {
  const res = await fetch(`/api/youtube-search?p=${encodeURIComponent(JSON.stringify(body))}`, { signal });
  let data = null;
  try { data = await res.json(); } catch { /* HTML エラーページ等 */ }
  if (!res.ok || !data) {
    const err = new Error(data?.message || data?.error || `HTTP ${res.status}`);
    err.quota = !!data?.quota;
    throw err;
  }
  return Array.isArray(data.items) ? data.items : [];
}

// React StrictMode の二重実行や複数コンポーネントの同時利用で
// 同じフィードを二重フェッチしないよう、進行中のリクエストを共有する
const inflight = {};
const lastError = {};

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
  // 空の結果はキャッシュしない（一時的な不調で1時間空のままになるのを防ぐ）
  if (!items.length) return;
  try {
    localStorage.setItem(CACHE_PREFIX + cacheKey, JSON.stringify({ at: Date.now(), items }));
  } catch { /* 容量超過は無視 */ }
}

function initState(cacheKey, ttl) {
  const cached = readCache(cacheKey, ttl);
  const err = lastError[cacheKey];
  if (!cached && err && Date.now() - err.at < ERROR_COOLDOWN) {
    return { items: [], loading: false, error: err.message };
  }
  return { items: cached || [], loading: !cached, error: null };
}

export function useYouTubeFeed(cacheKey, body, { ttl = DEFAULT_TTL } = {}) {
  const [state, setState] = useState(() => initState(cacheKey, ttl));
  const [attempt, setAttempt] = useState(0);

  // キーが変わったらキャッシュを読み直す（レンダー中の状態リセットパターン）
  const [prevKey, setPrevKey] = useState(cacheKey);
  if (prevKey !== cacheKey) {
    setPrevKey(cacheKey);
    setState(initState(cacheKey, ttl));
  }

  const bodyKey = JSON.stringify(body);

  useEffect(() => {
    if (readCache(cacheKey, ttl)) return; // キャッシュ済みなら initState が反映している
    const err = lastError[cacheKey];
    if (attempt === 0 && err && Date.now() - err.at < ERROR_COOLDOWN) return;

    let alive = true;

    if (!inflight[cacheKey]) {
      inflight[cacheKey] = fetchYouTubeSearch(JSON.parse(bodyKey))
        .finally(() => { delete inflight[cacheKey]; });
    }

    inflight[cacheKey]
      .then((items) => {
        delete lastError[cacheKey];
        writeCache(cacheKey, items);
        if (alive) setState({ items, loading: false, error: null });
      })
      .catch((e) => {
        lastError[cacheKey] = { at: Date.now(), message: e.message || 'failed' };
        if (alive) setState({ items: [], loading: false, error: e.message || 'failed' });
      });

    return () => { alive = false; };
  }, [cacheKey, bodyKey, ttl, attempt]);

  const retry = useCallback(() => {
    delete lastError[cacheKey];
    setState(s => ({ ...s, loading: true, error: null }));
    setAttempt(a => a + 1);
  }, [cacheKey]);

  return { ...state, retry };
}
