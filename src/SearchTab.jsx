// src/SearchTab.jsx
// 検索タブ：YouTube・X・TikTok・Instagram をひとつの検索窓から横断検索する
// ・YouTube は YouTube Data API + Gemini 撮可スコアリング
// ・X / TikTok / Instagram は Google Programmable Search（site:検索）で投稿を発見し、
//   タップするとアプリ内埋め込み（撮可シアター / 公式埋め込み）で表示する
// ・検索窓に SNS の URL を貼るとアーカイブ登録フローへ自動切替

import { useState } from 'react';
import { MEMBER_ALIASES } from './searchDict.js';
import { MEMBERS_FILTER, VENUES_FILTER, PERIODS_FILTER, PLATFORM_CONFIG, xUrl, tkUrl } from './data.js';
import { ClipRow, SnsRow, Spinner } from './components.jsx';
import EmbedModal from './EmbedModal.jsx';
import {
  useBookmarks, useArchive, loadJSON, saveJSON, KEYS,
  getSetting, getSearchHistory, addSearchHistory, getPinnedSearches, togglePinnedSearch,
} from './storage.js';

// ---------- ユーティリティ ----------

function extractYouTubeId(url) {
  const m = (url || '').match(/(?:youtube\.com\/(?:watch\?.*v=|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function extractTikTokId(url) {
  const m = (url || '').match(/\/video\/(\d+)/);
  return m ? m[1] : null;
}

function detectPlatform(url) {
  if (!url) return null;
  if (url.includes('x.com') || url.includes('twitter.com')) return 'x';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  return null;
}

function firstUrl(text) {
  const m = (text || '').match(/https?:\/\/[^\s]+/);
  return m ? m[0] : null;
}

function scoreVideo(video, q) {
  let score = 0;
  const title = (video.title || '').toLowerCase();
  const desc = (video.description || '').toLowerCase();
  const lq = q.toLowerCase();
  if (title.includes('撮可')) score += 30;
  if (title.includes('きゅるして') || title.includes('きゅるりん')) score += 20;
  if (lq && title.includes(lq)) score += 25;
  if (lq && desc.includes(lq)) score += 10;
  const daysOld = (Date.now() - new Date(video.publishedAt).getTime()) / (1000 * 86400);
  if (daysOld < 7) score += 20;
  else if (daysOld < 30) score += 10;
  return score;
}

function sortResults(items, mode, q) {
  if (mode === 'score') return [...items].sort((a, b) => (b.takaScore ?? -1) - (a.takaScore ?? -1));
  if (mode === 'date') return [...items].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  return [...items].sort((a, b) => scoreVideo(b, q) - scoreVideo(a, q));
}

function filterByContent(items, filter) {
  if (filter === 'taka') return items.filter(v => (v.takaScore ?? 0) >= 60 && !v.isOfficial);
  if (filter === 'official') return items.filter(v => v.isOfficial === true);
  return items;
}

function filterByMember(items, member) {
  if (!member || member === 'all') return items;
  const aliases = (MEMBER_ALIASES[member] || [member])
    .filter(a => /[^\x20-\x7e]/.test(a)); // 日本語エイリアスのみ（英字誤マッチ防止）
  if (aliases.length === 0) return items;
  return items.filter(v => {
    const text = `${v.title || ''} ${v.description || ''}`;
    return aliases.some(alias => text.includes(alias));
  });
}

// SNS 検索のセッションキャッシュ（Google CSE の無料枠 100件/日 を節約）
const SNS_CACHE_TTL = 30 * 60 * 1000;
function readSnsCache(key) {
  try {
    const raw = JSON.parse(sessionStorage.getItem('torca_sns_' + key));
    if (!raw || Date.now() - raw.at > SNS_CACHE_TTL) return null;
    return raw.items;
  } catch { return null; }
}
function writeSnsCache(key, items) {
  try { sessionStorage.setItem('torca_sns_' + key, JSON.stringify({ at: Date.now(), items })); } catch { /* 無視 */ }
}

// URL の投稿情報から Gemini でメンバー・曲・会場を推定する（AI自動登録）
async function aiExtractClipInfo({ url, title, authorName }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        systemPrompt: `あなたはアイドルグループ「きゅるりんってしてみて」のファン動画整理アシスタントです。
メンバーは 島村嬉唄（うたちゃん）・環やね（やねちゃん/やねぴ）・チバゆな（ゆなちゃん）・逃げ水あむ（あむちゃん）の4人です。
与えられた SNS 投稿の情報から、次の JSON のみを出力してください。説明文は一切不要です。
{"member": "島村嬉唄" | "環やね" | "チバゆな" | "逃げ水あむ" | null, "song": 曲名 | null, "venue": 会場名 | null, "label": 20字以内の見出し}
判断できない項目は null にしてください。`,
        userMessage: `URL: ${url}\nタイトル: ${title || '不明'}\n投稿者: ${authorName || '不明'}`,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const match = (data.text || '').match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    const validMember = MEMBERS_FILTER.some(m => m.id === parsed.member) ? parsed.member : null;
    return {
      member: validMember,
      song: typeof parsed.song === 'string' ? parsed.song : null,
      venue: typeof parsed.venue === 'string' ? parsed.venue : null,
      label: typeof parsed.label === 'string' ? parsed.label : null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------- 定義 ----------

const PLATFORM_TABS = [
  { id: 'youtube',   label: 'YouTube',   icon: '▶' },
  { id: 'x',         label: 'X',         icon: '𝕏' },
  { id: 'tiktok',    label: 'TikTok',    icon: '♪' },
  { id: 'instagram', label: 'Insta',     icon: '◎' },
];

const emptyPlat = () => ({ items: [], loading: false, error: null, notConfigured: false, fetched: false });

const chip = (active, color = 'var(--accent)') => ({
  padding: '7px 14px', borderRadius: 20,
  border: active ? `1.5px solid ${color}` : '1.5px solid var(--border-subtle)',
  background: active ? `${color}22` : 'var(--bg-card)',
  color: active ? color : 'var(--text-secondary)',
  fontSize: 13, fontWeight: active ? 700 : 500,
  cursor: 'pointer', transition: 'all 0.2s',
});

export default function SearchTab({ sharedUrl }) {
  const [query, setQuery] = useState('');
  const [memberFilter, setMemberFilter] = useState('all');
  const [venueFilter, setVenueFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('youtube');
  const [plat, setPlat] = useState({ youtube: emptyPlat(), x: emptyPlat(), tiktok: emptyPlat(), instagram: emptyPlat() });
  const [searched, setSearched] = useState(false);
  const [lastQuery, setLastQuery] = useState('');
  const [sortMode, setSortMode] = useState('score');
  const [contentFilter, setContentFilter] = useState('all');
  const [embedItem, setEmbedItem] = useState(null);

  const { toggle: toggleBookmark, has: isBookmarked } = useBookmarks();
  const { toggle: toggleArchive, has: isArchived } = useArchive();

  // Web Share Target / URL貼り付け用アーカイブフォーム
  const [archiveOpen, setArchiveOpen] = useState(() => !!sharedUrl);
  const [archiveUrl, setArchiveUrl] = useState(() => sharedUrl || '');
  const [sharedNotice, setSharedNotice] = useState(() => !!sharedUrl);
  const [archiveMember, setArchiveMember] = useState('');
  const [archiveNote, setArchiveNote] = useState('');
  const [archiveSaving, setArchiveSaving] = useState(false);
  const [archiveMsg, setArchiveMsg] = useState('');
  const [aiEnabled, setAiEnabled] = useState(() => getSetting('aiDefault'));
  const [history, setHistory] = useState(getSearchHistory);
  const [pinned, setPinned] = useState(getPinnedSearches);

  const liveFilters = {
    member: memberFilter !== 'all' ? memberFilter : null,
    venue: venueFilter || null,
    period: periodFilter,
  };

  const setPlatState = (p, patch) =>
    setPlat(prev => ({ ...prev, [p]: { ...prev[p], ...patch } }));

  // ---------- 検索実行 ----------

  const fetchYouTube = async (q) => {
    setPlatState('youtube', { loading: true, error: null, fetched: true });
    try {
      const res = await fetch('/api/youtube-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput: q, filters: liveFilters, order: 'relevance' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setPlatState('youtube', { items: sortResults(data.items || [], sortMode, q), loading: false });
    } catch {
      setPlatState('youtube', { items: [], loading: false, error: '検索に失敗しました。時間をおいて再度お試しください' });
    }
  };

  const fetchSns = async (p, q) => {
    const cacheKey = `${p}_${q}_${liveFilters.member || ''}_${liveFilters.period}`;
    const cached = readSnsCache(cacheKey);
    if (cached) {
      setPlatState(p, { items: cached, loading: false, error: null, notConfigured: false, fetched: true });
      return;
    }
    setPlatState(p, { loading: true, error: null, notConfigured: false, fetched: true });
    try {
      const res = await fetch('/api/sns-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: p, userInput: q, filters: liveFilters }),
      });
      const data = await res.json();
      if (res.status === 501) {
        setPlatState(p, { items: [], loading: false, notConfigured: true });
        return;
      }
      if (!res.ok) throw new Error(data.message || data.error || 'failed');
      writeSnsCache(cacheKey, data.items || []);
      setPlatState(p, { items: data.items || [], loading: false });
    } catch (err) {
      setPlatState(p, {
        items: [], loading: false,
        error: String(err.message || '').includes('quota') || String(err.message || '').includes('Quota')
          ? '本日の検索回数の上限に達しました。明日また試すか、外部アプリで検索してください'
          : '検索に失敗しました。外部アプリでの検索もお試しください',
      });
    }
  };

  const fetchPlatform = (p, q) => (p === 'youtube' ? fetchYouTube(q) : fetchSns(p, q));

  const doSearch = (overrideQuery) => {
    const q = overrideQuery ?? query;
    if (q.trim()) {
      addSearchHistory(q);
      setHistory(getSearchHistory());
    }
    setSearched(true);
    setLastQuery(q);
    setContentFilter('all');
    // 全タブの結果をリセットし、表示中のタブだけ即時取得（他は開いた時に取得）
    setPlat({ youtube: emptyPlat(), x: emptyPlat(), tiktok: emptyPlat(), instagram: emptyPlat() });
    fetchPlatform(activeTab, q);
  };

  const handleSearch = () => {
    const url = firstUrl(query);
    if (url && detectPlatform(url)) {
      setArchiveOpen(true);
      setArchiveUrl(url);
      setQuery('');
      setArchiveMsg('URLを検出しました。「保存」でアーカイブに登録できます');
      setTimeout(() => setArchiveMsg(''), 4000);
      return;
    }
    doSearch();
  };

  const switchTab = (p) => {
    setActiveTab(p);
    if (searched && !plat[p].fetched && !plat[p].loading) {
      fetchPlatform(p, lastQuery);
    }
  };

  const selectMember = (id) => {
    setMemberFilter(id);
    // SNS 検索はサーバー側絞り込みのため再取得（YouTube はクライアント側で絞り込み済み）
    if (searched && activeTab !== 'youtube') {
      setPlat(prev => ({
        ...prev,
        x: { ...prev.x, fetched: false },
        tiktok: { ...prev.tiktok, fetched: false },
        instagram: { ...prev.instagram, fetched: false },
      }));
      const nextFilters = { ...liveFilters, member: id !== 'all' ? id : null };
      // fetchSns は liveFilters を参照するため、setState 後の値で再実行
      setTimeout(() => fetchSnsWith(activeTab, lastQuery, nextFilters), 0);
    }
  };

  // member 変更直後の再取得用（state 更新を待たずにフィルターを直接渡す）
  const fetchSnsWith = async (p, q, filters) => {
    const cacheKey = `${p}_${q}_${filters.member || ''}_${filters.period}`;
    const cached = readSnsCache(cacheKey);
    if (cached) {
      setPlatState(p, { items: cached, loading: false, error: null, notConfigured: false, fetched: true });
      return;
    }
    setPlatState(p, { loading: true, error: null, notConfigured: false, fetched: true });
    try {
      const res = await fetch('/api/sns-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: p, userInput: q, filters }),
      });
      const data = await res.json();
      if (res.status === 501) { setPlatState(p, { items: [], loading: false, notConfigured: true }); return; }
      if (!res.ok) throw new Error(data.message || 'failed');
      writeSnsCache(cacheKey, data.items || []);
      setPlatState(p, { items: data.items || [], loading: false });
    } catch {
      setPlatState(p, { items: [], loading: false, error: '検索に失敗しました。外部アプリでの検索もお試しください' });
    }
  };

  const runQuick = (q) => { setQuery(q); doSearch(q); };
  const togglePin = (q) => setPinned(togglePinnedSearch(q));

  // SNS 結果の ♥ → アーカイブ保存
  const saveSnsResult = (item) => {
    toggleArchive({
      url: item.url,
      platform: item.platform,
      title: item.title || null,
      thumbnailUrl: item.thumbnailUrl || null,
      authorName: item.authorName || null,
      ...(item.platform === 'tiktok' ? { tiktokVideoId: extractTikTokId(item.url) } : {}),
    });
  };

  // 外部アプリで開くリンク（タブごと）
  const topic = [liveFilters.member ? (MEMBER_ALIASES[liveFilters.member]?.[0] || liveFilters.member) : '', lastQuery || query].filter(Boolean).join(' ');
  const externalUrl = {
    youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${topic} きゅるして 撮可`)}`,
    x: xUrl(`${topic || 'きゅるして'} 撮可 filter:native_video`),
    tiktok: tkUrl(`${topic} きゅるして 撮可`.trim()),
    instagram: `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(`${topic} きゅるして`.trim())}`,
  }[activeTab];

  // ---------- クリップボード・アーカイブ ----------

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const url = firstUrl(text);
      if (url && detectPlatform(url)) {
        setArchiveUrl(url);
        setArchiveMsg('クリップボードのURLを貼り付けました');
      } else if (text) {
        setArchiveUrl(text.trim());
        setArchiveMsg('URLを確認して「保存」を押してください');
      } else {
        setArchiveMsg('クリップボードが空です');
      }
    } catch {
      setArchiveMsg('クリップボードを読み取れませんでした。長押しで貼り付けてください');
    }
    setTimeout(() => setArchiveMsg(''), 4000);
  };

  const saveToArchive = async () => {
    const trimmed = archiveUrl.trim();
    if (!trimmed) return;
    const platform = detectPlatform(trimmed);
    if (!platform) {
      setArchiveMsg('X、TikTok、Instagram、YouTube の URL を入力してください');
      setTimeout(() => setArchiveMsg(''), 3000);
      return;
    }
    setArchiveSaving(true);
    const entry = {
      id: 'arch_' + Date.now(),
      url: trimmed,
      platform,
      member: archiveMember || null,
      note: archiveNote.trim() || null,
      savedAt: new Date().toISOString(),
      thumbnailUrl: null, title: null, authorName: null,
      song: null, venue: null, aiDetected: false,
      videoId: platform === 'youtube' ? extractYouTubeId(trimmed) : null,
    };
    if (platform !== 'instagram') {
      try {
        const r = await fetch(`/api/oembed?url=${encodeURIComponent(trimmed)}&platform=${platform}`);
        if (r.ok) {
          const oe = await r.json();
          entry.title = oe.title || null;
          entry.authorName = oe.authorName || null;
          entry.thumbnailUrl = oe.thumbnailUrl || null;
          if (platform === 'tiktok') {
            entry.tiktokVideoId = oe.videoId || null;
            if (oe.resolvedUrl) entry.url = oe.resolvedUrl; // 短縮 URL は実 URL に置き換えて保存
          }
        }
      } catch { /* oEmbed failure is non-critical */ }
    }

    let aiUsed = false;
    if (aiEnabled) {
      setArchiveMsg('🤖 AIがクリップ情報を解析中…');
      const ai = await aiExtractClipInfo({ url: trimmed, title: entry.title, authorName: entry.authorName });
      if (ai) {
        if (!entry.member && ai.member) entry.member = ai.member;
        entry.song = ai.song;
        entry.venue = ai.venue;
        if (!entry.note && ai.label) entry.note = ai.label;
        aiUsed = !!(ai.member || ai.song || ai.venue || ai.label);
        entry.aiDetected = aiUsed;
      }
    }

    const prev = loadJSON(KEYS.archive, []);
    saveJSON(KEYS.archive, [entry, ...prev]);
    setArchiveUrl('');
    setArchiveNote('');
    setArchiveMember('');
    setSharedNotice(false);
    setArchiveMsg(aiUsed ? '✅ アーカイブしました！（AIがメンバー・曲を自動判定）' : '✅ アーカイブしました！「みんなの撮可」で見られます');
    setArchiveSaving(false);
    setTimeout(() => setArchiveMsg(''), 4000);
  };

  // ---------- レンダリング ----------

  const cur = plat[activeTab];
  const ytVisible = filterByContent(filterByMember(plat.youtube.items, memberFilter), contentFilter);

  return (
    <div style={{ padding: '0 0 80px 0' }}>
      {embedItem && <EmbedModal item={embedItem} onClose={() => setEmbedItem(null)} />}

      <div style={{ padding: '16px 16px 0' }}>
        <h2 style={{
          fontSize: 20, fontWeight: 800, margin: '0 0 4px',
          background: 'linear-gradient(120deg, var(--accent-light), var(--accent2))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          撮可を探す
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 14px' }}>
          YouTube・X・TikTok・Instagram をまとめて検索
        </p>

        {sharedNotice && (
          <div style={{
            padding: '10px 14px', borderRadius: 10, marginBottom: 12,
            background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
            fontSize: 12, color: '#34d399', lineHeight: 1.5,
          }}>
            📥 共有されたURLを受け取りました。下の「保存」でアーカイブに登録できます
          </div>
        )}

        {/* 検索窓 */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="例：うたちゃん 幕張（URLを貼ると保存）"
            style={{
              width: '100%', padding: '14px 76px 14px 16px', borderRadius: 12,
              border: '1.5px solid var(--border-subtle)', background: 'var(--bg-card)',
              color: 'var(--text-primary)', fontSize: 15, outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
          />
          <button
            onClick={handleSearch}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              border: 'none', borderRadius: 8, padding: '9px 16px',
              color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >
            検索
          </button>
        </div>

        {/* ピン留め・履歴 */}
        {(pinned.length > 0 || history.length > 0) && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
            {pinned.map(q => (
              <span key={'pin_' + q} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 7px 5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
                color: '#fbbf24',
              }}>
                <span onClick={() => runQuick(q)} style={{ cursor: 'pointer' }}>{q}</span>
                <span onClick={() => togglePin(q)} title="ピン留め解除" style={{ cursor: 'pointer', fontSize: 11, opacity: 0.85 }}>★</span>
              </span>
            ))}
            {history.filter(q => !pinned.includes(q)).slice(0, 4).map(q => (
              <span key={'his_' + q} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 7px 5px 12px', borderRadius: 20, fontSize: 12,
                background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}>
                <span onClick={() => runQuick(q)} style={{ cursor: 'pointer' }}>🕐 {q}</span>
                <span onClick={() => togglePin(q)} title="ピン留め" style={{ cursor: 'pointer', fontSize: 11, opacity: 0.6 }}>☆</span>
              </span>
            ))}
          </div>
        )}

        {/* メンバー */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
          {MEMBERS_FILTER.map(m => (
            <button key={m.id} onClick={() => selectMember(m.id)} style={chip(memberFilter === m.id, m.color)}>
              {m.emoji} {m.label}
            </button>
          ))}
        </div>

        {/* プラットフォームタブ */}
        <div style={{
          display: 'flex', gap: 4, padding: 4, marginBottom: 12,
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12,
        }}>
          {PLATFORM_TABS.map(t => {
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => switchTab(t.id)}
                style={{
                  flex: 1, padding: '9px 4px', borderRadius: 9, border: 'none',
                  background: active ? 'linear-gradient(135deg, var(--accent), var(--accent2))' : 'transparent',
                  color: active ? '#fff' : 'var(--text-secondary)',
                  fontSize: 12, fontWeight: active ? 800 : 500, cursor: 'pointer',
                  transition: 'all 0.2s', whiteSpace: 'nowrap',
                }}>
                {t.icon} {t.label}
              </button>
            );
          })}
        </div>

        {/* 会場・期間（YouTube タブのみ） */}
        {activeTab === 'youtube' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <select value={venueFilter} onChange={e => setVenueFilter(e.target.value)}
              style={{
                padding: '8px 10px', borderRadius: 10, border: '1.5px solid var(--border-subtle)',
                background: 'var(--bg-card)', color: venueFilter ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: 12, cursor: 'pointer', flex: 1, minWidth: 140,
              }}>
              {VENUES_FILTER.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
            <select value={periodFilter} onChange={e => setPeriodFilter(e.target.value)}
              style={{
                padding: '8px 10px', borderRadius: 10, border: '1.5px solid var(--border-subtle)',
                background: 'var(--bg-card)', color: periodFilter !== 'all' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: 12, cursor: 'pointer', flex: 1, minWidth: 120,
              }}>
              {PERIODS_FILTER.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
        )}

        {/* URL アーカイブ（AI 自動登録） */}
        <div style={{ marginBottom: 4 }}>
          <button
            onClick={() => setArchiveOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              background: archiveOpen ? 'rgba(var(--accent-rgb),0.08)' : 'var(--bg-card)',
              border: archiveOpen ? '1px solid rgba(var(--accent-rgb),0.35)' : '1px solid var(--border-subtle)',
              borderRadius: 12, cursor: 'pointer',
              color: 'var(--text-primary)', fontSize: 13, padding: '11px 14px', fontWeight: 700,
              transition: 'all 0.2s',
            }}
          >
            <span style={{ transform: archiveOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block', fontSize: 11 }}>▶</span>
            📥 URLをアーカイブ <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 400 }}>🤖AI自動判定</span>
          </button>
          {archiveOpen && (
            <div style={{ marginTop: 8, padding: '13px 14px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  type="url"
                  value={archiveUrl}
                  onChange={e => setArchiveUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveToArchive()}
                  placeholder="https://x.com/... / tiktok.com/... / youtu.be/..."
                  style={{
                    flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: 8,
                    border: '1.5px solid var(--border-subtle)', background: '#0c0c12',
                    color: 'var(--text-primary)', fontSize: 13, outline: 'none',
                  }}
                />
                <button onClick={pasteFromClipboard} title="クリップボードから貼り付け"
                  style={{
                    padding: '10px 12px', borderRadius: 8,
                    border: '1.5px solid var(--border-subtle)', background: 'transparent',
                    color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer', flexShrink: 0,
                  }}>📋</button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <select value={archiveMember} onChange={e => setArchiveMember(e.target.value)}
                  style={{
                    padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border-subtle)',
                    background: '#0c0c12', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', flex: 1, minWidth: 0,
                  }}>
                  <option value="">メンバー（AIが自動判定）</option>
                  {MEMBERS_FILTER.filter(m => m.id !== 'all').map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
                <input type="text" value={archiveNote} onChange={e => setArchiveNote(e.target.value)}
                  placeholder="メモ（任意）"
                  style={{
                    flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 8,
                    border: '1.5px solid var(--border-subtle)', background: '#0c0c12',
                    color: 'var(--text-primary)', fontSize: 12, outline: 'none',
                  }} />
              </div>
              <button onClick={saveToArchive} disabled={archiveSaving || !archiveUrl.trim()}
                style={{
                  width: '100%', padding: '11px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                  color: '#fff', fontWeight: 800, fontSize: 13,
                  cursor: archiveSaving || !archiveUrl.trim() ? 'not-allowed' : 'pointer',
                  opacity: archiveSaving || !archiveUrl.trim() ? 0.55 : 1,
                  marginBottom: 8,
                }}>
                {archiveSaving ? '🤖 解析中…' : '保存する'}
              </button>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={aiEnabled} onChange={e => setAiEnabled(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
                🤖 AIでメンバー・曲・会場を自動判定して登録する
              </label>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.6 }}>
                📲 Android版アプリなら、XやTikTokの共有シートから「TORCA」を選ぶだけで自動入力されます
              </div>
              {archiveMsg && (
                <div style={{
                  fontSize: 12, padding: '8px 12px', borderRadius: 8, marginTop: 8, lineHeight: 1.5,
                  background: archiveMsg.includes('ませんでした') || archiveMsg.includes('ください')
                    ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.15)',
                  color: archiveMsg.includes('ませんでした') || archiveMsg.includes('ください')
                    ? '#fbbf24' : '#34d399',
                }}>
                  {archiveMsg}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================= 結果エリア ================= */}

      {/* 未検索 */}
      {!searched && (
        <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🎬</div>
          <p style={{ fontSize: 14, margin: 0 }}>キーワードひとつで4つのSNSを横断検索</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>例：「あむちゃん 幕張」「やねぴのソロ」</p>
        </div>
      )}

      {/* 結果ヘッダー（外部リンク付き） */}
      {searched && !cur.loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 8px' }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {activeTab === 'youtube' ? `${ytVisible.length}件` : cur.items.length > 0 ? `${cur.items.length}件` : ''}
          </span>
          <a href={externalUrl} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, color: 'var(--text-secondary)', textDecoration: 'none' }}>
            {PLATFORM_CONFIG[activeTab].icon} 外部アプリで開く ↗
          </a>
        </div>
      )}

      {cur.loading && <Spinner label={`${PLATFORM_TABS.find(t => t.id === activeTab)?.label} を検索中…`} />}

      {/* エラー / 未設定 */}
      {searched && !cur.loading && cur.error && (
        <div style={{
          margin: '0 16px', padding: '12px 16px', borderRadius: 10,
          background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.3)',
          color: '#e74c3c', fontSize: 12, lineHeight: 1.6,
        }}>
          {cur.error}
        </div>
      )}
      {searched && !cur.loading && cur.notConfigured && (
        <div style={{
          margin: '0 16px', padding: '16px', borderRadius: 12, textAlign: 'center',
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
        }}>
          <div style={{ fontSize: 26, marginBottom: 8 }}>🔧</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>SNS横断検索は準備中です</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 12 }}>
            運営向け：Vercel の環境変数に <code>TAVILY_API_KEY</code> を<br />
            設定すると有効になります（app.tavily.com で無料取得）
          </div>
          <a href={externalUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-block', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', borderRadius: 10, padding: '9px 18px', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
            {PLATFORM_CONFIG[activeTab].icon} 外部アプリで検索 ↗
          </a>
        </div>
      )}

      {/* YouTube 結果 */}
      {searched && activeTab === 'youtube' && !cur.loading && !cur.error && plat.youtube.items.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', padding: '0 16px', marginBottom: 8 }}>
            {[{ id: 'score', label: '📸 スコア順' }, { id: 'date', label: '新しい順' }, { id: 'relevance', label: '関連度' }].map(s => (
              <button key={s.id}
                onClick={() => {
                  setSortMode(s.id);
                  setPlatState('youtube', { items: sortResults([...plat.youtube.items], s.id, lastQuery) });
                }}
                style={{
                  padding: '4px 10px', borderRadius: 20,
                  border: sortMode === s.id ? '1.5px solid var(--accent)' : '1.5px solid var(--border-subtle)',
                  background: sortMode === s.id ? 'rgba(224,64,160,0.15)' : 'transparent',
                  color: sortMode === s.id ? 'var(--accent-light)' : 'var(--text-secondary)',
                  fontSize: 11, fontWeight: sortMode === s.id ? 700 : 400, cursor: 'pointer',
                }}>
                {s.label}
              </button>
            ))}
            {[{ id: 'taka', label: '📸 撮可のみ' }, { id: 'official', label: '🏷 公式のみ' }].map(f => (
              <button key={f.id}
                onClick={() => setContentFilter(contentFilter === f.id ? 'all' : f.id)}
                style={{
                  padding: '4px 10px', borderRadius: 20,
                  border: contentFilter === f.id ? '1.5px solid var(--accent)' : '1.5px solid var(--border-subtle)',
                  background: contentFilter === f.id ? 'rgba(224,64,160,0.15)' : 'transparent',
                  color: contentFilter === f.id ? 'var(--accent-light)' : 'var(--text-secondary)',
                  fontSize: 11, fontWeight: contentFilter === f.id ? 700 : 400, cursor: 'pointer',
                }}>
                {f.label}
              </button>
            ))}
          </div>
          <div style={{ padding: '0 16px' }}>
            {ytVisible.map((video, i) => (
              <ClipRow key={video.videoId} video={video} queue={ytVisible} queueIndex={i}
                bookmarked={isBookmarked(video.videoId)} onToggleBookmark={toggleBookmark} />
            ))}
            {ytVisible.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)', fontSize: 12 }}>
                このフィルターに該当する動画がありません
              </div>
            )}
          </div>
        </>
      )}

      {/* SNS 結果（X / TikTok / Instagram） */}
      {searched && activeTab !== 'youtube' && !cur.loading && !cur.error && !cur.notConfigured && cur.items.length > 0 && (
        <div style={{ padding: '0 16px' }}>
          {cur.items.map(item => (
            <SnsRow key={item.url} item={item}
              platformConfig={PLATFORM_CONFIG[item.platform]}
              saved={isArchived(item.url)}
              onToggleSave={saveSnsResult}
              onOpen={setEmbedItem} />
          ))}
          <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.6, padding: '4px 2px' }}>
            💡 検索結果は Google のインデックスに基づきます。最新の投稿は「外部アプリで開く」も併用してください
          </div>
        </div>
      )}

      {/* 0件 */}
      {searched && !cur.loading && !cur.error && !cur.notConfigured && cur.fetched &&
        ((activeTab === 'youtube' && plat.youtube.items.length === 0) || (activeTab !== 'youtube' && cur.items.length === 0)) && (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
          <p style={{ fontSize: 13, margin: 0 }}>見つかりませんでした</p>
          <p style={{ fontSize: 11, marginTop: 6 }}>
            キーワードを変えるか、<a href={externalUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-light)' }}>外部アプリで検索 ↗</a> してみてください
          </p>
        </div>
      )}
    </div>
  );
}
