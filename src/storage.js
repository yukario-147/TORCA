// src/storage.js
// localStorage 永続化と「共有コード」ユーティリティ
// ユーザーデータはすべて端末内（localStorage）に保存され、サーバーには送信されない。

import { useState } from 'react';

export const KEYS = {
  bookmarks: 'torca_bookmarks',
  archive: 'torca_archive',
  saved: 'torca_saved',
  member: 'torca_member',
  accent: 'torca_accent',
  onboarding: 'torca_onboarding_done',
  settings: 'torca_settings',
  searchHistory: 'torca_search_history',
  pinnedSearches: 'torca_pinned_searches',
  oshiSince: 'torca_oshi_since',
  prevVisit: 'torca_prev_visit',
  lastVisit: 'torca_last_visit',
};

export function loadJSON(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* 容量超過などは無視（アプリ動作を止めない） */ }
}

// YouTube ブックマークの読み書きを共有するフック（検索・ホーム・推しタブで共用）
export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState(() => loadJSON(KEYS.bookmarks, []));
  const toggle = (video) => {
    setBookmarks(prev => {
      const next = prev.some(b => b.videoId === video.videoId)
        ? prev.filter(b => b.videoId !== video.videoId)
        : [...prev, { ...video, savedAt: new Date().toISOString() }];
      saveJSON(KEYS.bookmarks, next);
      return next;
    });
  };
  const has = (videoId) => bookmarks.some(b => b.videoId === videoId);
  return { bookmarks, toggle, has };
}

// SNS 検索結果（X/TikTok/Instagram）を URL キーでアーカイブに保存/解除するフック
export function useArchive() {
  const [archive, setArchive] = useState(() => loadJSON(KEYS.archive, []));
  const toggle = (entry) => {
    setArchive(prev => {
      const exists = prev.some(a => a.url === entry.url);
      const next = exists
        ? prev.filter(a => a.url !== entry.url)
        : [{
            id: 'arch_' + Date.now(),
            savedAt: new Date().toISOString(),
            member: null, note: null, song: null, venue: null, aiDetected: false,
            ...entry,
          }, ...prev];
      saveJSON(KEYS.archive, next);
      return next;
    });
  };
  const has = (url) => archive.some(a => a.url === url);
  return { archive, toggle, has };
}

// =====================
// 共有コード（みんなの撮可）
// サーバーを介さず、テキストのコードでアーカイブをファン同士で交換する。
// 形式: "TORCA1." + base64(UTF-8 JSON)
// =====================
const SHARE_PREFIX = 'TORCA1.';
const SHARE_LIMIT = 100; // コードが巨大になりすぎないよう新しい順に制限

function bytesToBase64(bytes) {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function buildShareCode({ bookmarks = [], archive = [] }) {
  const byNewest = (a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0);
  const payload = {
    v: 1,
    exportedAt: new Date().toISOString(),
    bookmarks: [...bookmarks].sort(byNewest).slice(0, SHARE_LIMIT)
      .map(({ videoId, title, channelTitle, thumbnailUrl, publishedAt, savedAt, takaScore }) =>
        ({ videoId, title, channelTitle, thumbnailUrl, publishedAt, savedAt, takaScore })),
    archive: [...archive].sort(byNewest).slice(0, SHARE_LIMIT),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  return SHARE_PREFIX + bytesToBase64(bytes);
}

export function parseShareCode(code) {
  const trimmed = (code || '').trim();
  if (!trimmed.startsWith(SHARE_PREFIX)) {
    throw new Error('共有コードの形式が正しくありません（TORCA1. で始まるコードを貼り付けてください）');
  }
  let payload;
  try {
    const bytes = base64ToBytes(trimmed.slice(SHARE_PREFIX.length));
    payload = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error('共有コードを読み取れませんでした。コード全体をコピーできているか確認してください');
  }
  return {
    bookmarks: Array.isArray(payload.bookmarks) ? payload.bookmarks.filter(b => b && b.videoId) : [],
    archive: Array.isArray(payload.archive) ? payload.archive.filter(a => a && a.url) : [],
  };
}

// 共有コードの内容を自分のアーカイブへマージ（videoId / url で重複排除）
// 戻り値は追加された件数
export function mergeShareData({ bookmarks: inBookmarks, archive: inArchive }) {
  const bookmarks = loadJSON(KEYS.bookmarks, []);
  const archive = loadJSON(KEYS.archive, []);

  const knownVideoIds = new Set(bookmarks.map(b => b.videoId));
  const newBookmarks = inBookmarks.filter(b => !knownVideoIds.has(b.videoId))
    .map(b => ({ ...b, savedAt: b.savedAt || new Date().toISOString(), shared: true }));

  const knownUrls = new Set(archive.map(a => a.url));
  const newArchive = inArchive.filter(a => !knownUrls.has(a.url))
    .map(a => ({ ...a, id: a.id || 'arch_' + Math.random().toString(36).slice(2), shared: true }));

  if (newBookmarks.length > 0) saveJSON(KEYS.bookmarks, [...bookmarks, ...newBookmarks]);
  if (newArchive.length > 0) saveJSON(KEYS.archive, [...newArchive, ...archive]);

  return newBookmarks.length + newArchive.length;
}

// =====================
// アプリ設定
// =====================
const DEFAULT_SETTINGS = { aiDefault: true };

export function getSetting(key) {
  const s = loadJSON(KEYS.settings, {});
  return key in s ? s[key] : DEFAULT_SETTINGS[key];
}

export function setSetting(key, value) {
  const s = loadJSON(KEYS.settings, {});
  saveJSON(KEYS.settings, { ...s, [key]: value });
}

// =====================
// 検索履歴・ピン留め検索
// =====================
const HISTORY_LIMIT = 10;

export function getSearchHistory() {
  return loadJSON(KEYS.searchHistory, []);
}

export function addSearchHistory(query) {
  const q = (query || '').trim();
  if (!q) return;
  const next = [q, ...getSearchHistory().filter(h => h !== q)].slice(0, HISTORY_LIMIT);
  saveJSON(KEYS.searchHistory, next);
}

export function clearSearchHistory() {
  saveJSON(KEYS.searchHistory, []);
}

export function getPinnedSearches() {
  return loadJSON(KEYS.pinnedSearches, []);
}

export function togglePinnedSearch(query) {
  const q = (query || '').trim();
  if (!q) return getPinnedSearches();
  const cur = getPinnedSearches();
  const next = cur.includes(q) ? cur.filter(p => p !== q) : [...cur, q].slice(0, 8);
  saveJSON(KEYS.pinnedSearches, next);
  return next;
}

// =====================
// 前回訪問（NEW バッジ用）
// セッション初回に「前回の最終訪問時刻」を確定し、以降そのセッション中は固定
// =====================
export function getPrevVisit() {
  try {
    if (!sessionStorage.getItem('torca_session_started')) {
      sessionStorage.setItem('torca_session_started', '1');
      const last = localStorage.getItem(KEYS.lastVisit);
      if (last) localStorage.setItem(KEYS.prevVisit, last);
      localStorage.setItem(KEYS.lastVisit, new Date().toISOString());
    }
    return localStorage.getItem(KEYS.prevVisit) || null;
  } catch {
    return null;
  }
}

export function isNewSince(publishedAt) {
  const prev = getPrevVisit();
  return !!(prev && publishedAt && publishedAt > prev);
}

// =====================
// 推し歴（メンバーごとに最初に推した日を記録）
// =====================
export function recordOshiSince(memberId) {
  if (!memberId) return;
  const map = loadJSON(KEYS.oshiSince, {});
  if (!map[memberId]) {
    saveJSON(KEYS.oshiSince, { ...map, [memberId]: new Date().toISOString() });
  }
}

export function oshiDays(memberId) {
  const map = loadJSON(KEYS.oshiSince, {});
  if (!memberId || !map[memberId]) return null;
  return Math.max(1, Math.floor((Date.now() - new Date(map[memberId]).getTime()) / 86400000) + 1);
}

// =====================
// バックアップ（機種変更・ブラウザ移行用）
// torca_* のユーザーデータを JSON 化。フィードキャッシュは含めない
// =====================
const BACKUP_KEYS = [
  KEYS.bookmarks, KEYS.archive, KEYS.saved, KEYS.member, KEYS.accent,
  KEYS.onboarding, KEYS.settings, KEYS.searchHistory, KEYS.pinnedSearches, KEYS.oshiSince,
];

export function exportBackup() {
  const data = {};
  for (const key of BACKUP_KEYS) {
    const v = localStorage.getItem(key);
    if (v !== null) data[key] = v;
  }
  return JSON.stringify({ app: 'TORCA', v: 1, exportedAt: new Date().toISOString(), data }, null, 2);
}

export function importBackup(json) {
  let payload;
  try {
    payload = JSON.parse(json);
  } catch {
    throw new Error('バックアップファイルを読み取れませんでした');
  }
  if (payload?.app !== 'TORCA' || !payload.data) {
    throw new Error('TORCAのバックアップファイルではありません');
  }
  let count = 0;
  for (const [key, value] of Object.entries(payload.data)) {
    if (BACKUP_KEYS.includes(key) && typeof value === 'string') {
      localStorage.setItem(key, value);
      count++;
    }
  }
  return count;
}

export function clearFeedCache() {
  const removed = [];
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith('torca_feed_')) {
      removed.push(key);
      localStorage.removeItem(key);
    }
  }
  return removed.length;
}

export function clearAllData() {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith('torca_')) localStorage.removeItem(key);
  }
}
