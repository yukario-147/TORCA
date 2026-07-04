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
