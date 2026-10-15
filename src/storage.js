// src/storage.js
// localStorage 永続化と「共有コード」ユーティリティ
// ユーザーデータはすべて端末内（localStorage）に保存され、サーバーには送信されない。

import { useCallback, useSyncExternalStore } from 'react';
import { detectPlatform, extractYouTubeId, extractTikTokId, isHttpsUrl } from './urls.js';
import { KYURUSHITE } from './data.js';

export const KEYS = {
  bookmarks: 'torca_bookmarks',
  archive: 'torca_archive',
  member: 'torca_member',
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

export function getItem(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function setItem(key, value) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* 無視 */ }
}

// =====================
// リスト型データの共有ストア
// ブックマーク・アーカイブは複数画面（ホーム・プレイヤー・検索・みんなの撮可）から同時に読み書きされる。
// 画面ごとに state を持つと古い一覧で上書きして保存データが消えるため、
// 単一のストアを useSyncExternalStore で購読する。
// =====================
const listCache = new Map();
const listeners = new Map();

function readList(key) {
  if (!listCache.has(key)) {
    const v = loadJSON(key, []);
    listCache.set(key, Array.isArray(v) ? v : []);
  }
  return listCache.get(key);
}

function emit(key) {
  listeners.get(key)?.forEach(fn => fn());
}

export function updateList(key, updater) {
  const prev = readList(key);
  const next = updater(prev);
  if (next === prev) return;
  listCache.set(key, next);
  saveJSON(key, next);
  emit(key);
}

function subscribeList(key, fn) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(fn);
  return () => listeners.get(key).delete(fn);
}

// 別タブでの変更も反映する
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && listCache.has(e.key)) {
      listCache.delete(e.key);
      emit(e.key);
    }
  });
}

// フック外（エフェクト内など）から最新の一覧を読む
export const getList = (key) => readList(key);

export function useStoredList(key) {
  const subscribe = useCallback((fn) => subscribeList(key, fn), [key]);
  return useSyncExternalStore(subscribe, () => readList(key));
}

const newArchiveId = () => 'arch_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// YouTube ブックマーク（説明文などの大きいフィールドは保存しない）
function slimVideo(v) {
  return {
    videoId: v.videoId,
    title: v.title || '',
    channelTitle: v.channelTitle || '',
    thumbnailUrl: v.thumbnailUrl || '',
    publishedAt: v.publishedAt || '',
    viewCount: v.viewCount || 0,
    takaScore: typeof v.takaScore === 'number' ? v.takaScore : null,
    isOfficial: !!v.isOfficial,
  };
}

export function useBookmarks() {
  const bookmarks = useStoredList(KEYS.bookmarks);
  const toggle = useCallback((video) => {
    if (!video?.videoId) return;
    updateList(KEYS.bookmarks, prev => (
      prev.some(b => b.videoId === video.videoId)
        ? prev.filter(b => b.videoId !== video.videoId)
        : [...prev, { ...slimVideo(video), savedAt: new Date().toISOString() }]
    ));
  }, []);
  const remove = useCallback((videoId) => {
    updateList(KEYS.bookmarks, prev => prev.filter(b => b.videoId !== videoId));
  }, []);
  const has = (videoId) => bookmarks.some(b => b.videoId === videoId);
  return { bookmarks, toggle, remove, has };
}

// アーカイブ（X/TikTok/Instagram/YouTube の URL を保存）。URL で重複排除する
function newArchiveEntry(entry) {
  return {
    id: newArchiveId(),
    savedAt: new Date().toISOString(),
    member: null, note: null, song: null, venue: null, aiDetected: false,
    title: null, authorName: null, thumbnailUrl: null,
    ...entry,
  };
}

export function useArchive() {
  const archive = useStoredList(KEYS.archive);
  const toggle = useCallback((entry) => {
    updateList(KEYS.archive, prev => (
      prev.some(a => a.url === entry.url)
        ? prev.filter(a => a.url !== entry.url)
        : [newArchiveEntry(entry), ...prev]
    ));
  }, []);
  // 追加できたら true（同じ URL が登録済みなら false）
  const add = useCallback((entry) => {
    let added = false;
    updateList(KEYS.archive, prev => {
      if (prev.some(a => a.url === entry.url)) return prev;
      added = true;
      return [newArchiveEntry(entry), ...prev];
    });
    return added;
  }, []);
  const remove = useCallback((id) => {
    updateList(KEYS.archive, prev => prev.filter(a => a.id !== id));
  }, []);
  const patch = useCallback((id, fields) => {
    updateList(KEYS.archive, prev => prev.map(a => (a.id === id ? { ...a, ...fields } : a)));
  }, []);
  const has = (url) => archive.some(a => a.url === url);
  return { archive, toggle, add, remove, patch, has };
}

// =====================
// 共有コード（みんなの撮可）
// サーバーを介さず、テキストのコードでアーカイブをファン同士で交換する。
// 形式: "TORCA1." + base64(UTF-8 JSON)
// 他人のコードは信頼できない入力なので、取り込み時に URL・ID・文字列長を検証する。
// =====================
const SHARE_PREFIX = 'TORCA1.';
const SHARE_LIMIT = 100; // コードが巨大になりすぎないよう新しい順に制限
const MEMBER_NAMES = new Set(KYURUSHITE.members.map(m => m.name));

function bytesToBase64(bytes) {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

function base64ToBytes(b64) {
  const bin = atob(b64.replace(/\s+/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

const str = (v, max = 200) => (typeof v === 'string' && v.trim() ? Array.from(v).slice(0, max).join('') : null);
const isoOrNow = (v) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : new Date().toISOString());

function sanitizeBookmark(b) {
  if (!b || typeof b.videoId !== 'string' || !/^[\w-]{11}$/.test(b.videoId)) return null;
  return {
    ...slimVideo({
      ...b,
      title: str(b.title, 200) || '',
      channelTitle: str(b.channelTitle, 100) || '',
      thumbnailUrl: isHttpsUrl(b.thumbnailUrl) ? b.thumbnailUrl : '',
      publishedAt: str(b.publishedAt, 40) || '',
      viewCount: Number.isFinite(b.viewCount) ? b.viewCount : 0,
    }),
    savedAt: isoOrNow(b.savedAt),
  };
}

function sanitizeArchive(a) {
  if (!a || !isHttpsUrl(a.url) || a.url.length > 500) return null;
  const platform = detectPlatform(a.url);
  if (!platform) return null;
  const tiktokVideoId = typeof a.tiktokVideoId === 'string' && /^\d+$/.test(a.tiktokVideoId)
    ? a.tiktokVideoId : (platform === 'tiktok' ? extractTikTokId(a.url) : null);
  return {
    id: newArchiveId(),
    url: a.url,
    platform,
    member: MEMBER_NAMES.has(a.member) ? a.member : null,
    note: str(a.note, 100),
    title: str(a.title, 200),
    authorName: str(a.authorName, 80),
    song: str(a.song, 60),
    venue: str(a.venue, 60),
    thumbnailUrl: isHttpsUrl(a.thumbnailUrl) ? a.thumbnailUrl : null,
    videoId: platform === 'youtube' ? extractYouTubeId(a.url) : null,
    ...(tiktokVideoId ? { tiktokVideoId } : {}),
    aiDetected: a.aiDetected === true,
    savedAt: isoOrNow(a.savedAt),
  };
}

export function buildShareCode({ bookmarks = [], archive = [] }) {
  const byNewest = (a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0);
  const payload = {
    v: 1,
    exportedAt: new Date().toISOString(),
    bookmarks: [...bookmarks].sort(byNewest).slice(0, SHARE_LIMIT)
      .map(({ videoId, title, channelTitle, thumbnailUrl, publishedAt, savedAt, takaScore }) =>
        ({ videoId, title, channelTitle, thumbnailUrl, publishedAt, savedAt, takaScore })),
    archive: [...archive].sort(byNewest).slice(0, SHARE_LIMIT)
      .map(({ url, platform, member, note, title, authorName, song, venue, thumbnailUrl, tiktokVideoId, aiDetected, savedAt }) =>
        ({ url, platform, member, note, title, authorName, song, venue, thumbnailUrl, tiktokVideoId, aiDetected, savedAt })),
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
  const list = (v) => (Array.isArray(v) ? v.slice(0, SHARE_LIMIT) : []);
  return {
    bookmarks: list(payload?.bookmarks).map(sanitizeBookmark).filter(Boolean),
    archive: list(payload?.archive).map(sanitizeArchive).filter(Boolean),
  };
}

// 共有コードの内容を自分のアーカイブへマージ（videoId / url で重複排除）
// 戻り値は追加された件数
export function mergeShareData({ bookmarks: inBookmarks, archive: inArchive }) {
  let added = 0;
  updateList(KEYS.bookmarks, prev => {
    const known = new Set(prev.map(b => b.videoId));
    const fresh = inBookmarks.filter(b => !known.has(b.videoId) && known.add(b.videoId))
      .map(b => ({ ...b, shared: true }));
    added += fresh.length;
    return fresh.length ? [...prev, ...fresh] : prev;
  });
  updateList(KEYS.archive, prev => {
    const known = new Set(prev.map(a => a.url));
    const fresh = inArchive.filter(a => !known.has(a.url) && known.add(a.url))
      .map(a => ({ ...a, shared: true }));
    added += fresh.length;
    return fresh.length ? [...fresh, ...prev] : prev;
  });
  return added;
}

// =====================
// アプリ設定
// =====================
const DEFAULT_SETTINGS = { aiDefault: true };

export function getSetting(key) {
  const s = loadJSON(KEYS.settings, {});
  return s && key in s ? s[key] : DEFAULT_SETTINGS[key];
}

export function setSetting(key, value) {
  const s = loadJSON(KEYS.settings, {});
  saveJSON(KEYS.settings, { ...s, [key]: value });
}

// =====================
// 検索履歴・ピン留め検索
// =====================
const HISTORY_LIMIT = 10;

const strList = (key) => {
  const v = loadJSON(key, []);
  return Array.isArray(v) ? v.filter(x => typeof x === 'string') : [];
};

export function getSearchHistory() {
  return strList(KEYS.searchHistory);
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
  return strList(KEYS.pinnedSearches);
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
let prevVisitMemo;

export function getPrevVisit() {
  if (prevVisitMemo !== undefined) return prevVisitMemo;
  try {
    if (!sessionStorage.getItem('torca_session_started')) {
      sessionStorage.setItem('torca_session_started', '1');
      const last = localStorage.getItem(KEYS.lastVisit);
      if (last) localStorage.setItem(KEYS.prevVisit, last);
      localStorage.setItem(KEYS.lastVisit, new Date().toISOString());
    }
    prevVisitMemo = localStorage.getItem(KEYS.prevVisit) || null;
  } catch {
    prevVisitMemo = null;
  }
  return prevVisitMemo;
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
  if (!memberId || !map?.[memberId]) return null;
  return Math.max(1, Math.floor((Date.now() - new Date(map[memberId]).getTime()) / 86400000) + 1);
}

// =====================
// バックアップ（機種変更・ブラウザ移行用）
// torca_* のユーザーデータを JSON 化。フィードキャッシュは含めない
// =====================
const BACKUP_KEYS = [
  KEYS.bookmarks, KEYS.archive, KEYS.member, KEYS.onboarding, KEYS.settings,
  KEYS.searchHistory, KEYS.pinnedSearches, KEYS.oshiSince,
];

export function exportBackup() {
  const data = {};
  for (const key of BACKUP_KEYS) {
    const v = getItem(key);
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
      setItem(key, value);
      listCache.delete(key);
      count++;
    }
  }
  return count;
}

export function clearFeedCache() {
  let removed = 0;
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('torca_feed_')) {
        localStorage.removeItem(key);
        removed++;
      }
    }
  } catch { /* 無視 */ }
  return removed;
}

export function clearAllData() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('torca_')) localStorage.removeItem(key);
    }
  } catch { /* 無視 */ }
  listCache.clear();
}
