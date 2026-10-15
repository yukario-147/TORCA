// src/urls.js
// SNS / YouTube の URL 判定・ID 抽出（検索・アーカイブ・埋め込みで共用）

const HOSTS = {
  x: ['x.com', 'twitter.com'],
  tiktok: ['tiktok.com'],
  instagram: ['instagram.com'],
  youtube: ['youtube.com', 'youtu.be'],
};

function hostOf(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return u.hostname.toLowerCase();
  } catch {
    return null;
  }
}

// ホスト名で判定する（"dropbox.com" を X と誤判定しないよう部分一致は使わない）
export function detectPlatform(url) {
  const host = hostOf(url);
  if (!host) return null;
  for (const [platform, domains] of Object.entries(HOSTS)) {
    if (domains.some(d => host === d || host.endsWith('.' + d))) return platform;
  }
  return null;
}

export function firstUrl(text) {
  const m = (text || '').match(/https?:\/\/[^\s<>"']+/);
  return m ? m[0] : null;
}

export function extractYouTubeId(url) {
  const m = (url || '').match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

export function extractTikTokId(url) {
  const m = (url || '').match(/\/video\/(\d+)/);
  return m ? m[1] : null;
}

export function xStatusId(url) {
  const m = (url || '').match(/status(?:es)?\/(\d+)/);
  return m ? m[1] : null;
}

export function igShortcode(url) {
  const m = (url || '').match(/\/(?:p|reel|reels|tv)\/([\w-]+)/);
  return m ? m[1] : null;
}

export const isHttpsUrl = (v) => typeof v === 'string' && /^https:\/\/[^\s]+$/i.test(v);
