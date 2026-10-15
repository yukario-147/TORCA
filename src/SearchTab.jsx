// src/SearchTab.jsx
// さがすタブ：YouTube・X・TikTok・Instagram をひとつの検索窓から横断検索する
// ・YouTube は YouTube Data API + Gemini 撮可スコアリング
// ・X / TikTok / Instagram は検索 API（Tavily 等）で投稿を発見し、
//   タップするとアプリ内埋め込み（公式埋め込み）で表示する
// ・検索窓に SNS の URL を貼るとアーカイブ登録フローへ自動切替

import { useState, useRef } from 'react';
import { MEMBER_ALIASES } from './searchDict.js';
import { MEMBERS_FILTER, VENUES_FILTER, PERIODS_FILTER, PLATFORM_CONFIG, xUrl, tkUrl } from './data.js';
import { chipVars } from './theme.js';
import { ClipRow, SnsRow, Spinner, PageHead, EmptyState, Notice } from './components.jsx';
import { Icon } from './icons.jsx';
import EmbedModal from './EmbedModal.jsx';
import { fetchYouTubeSearch } from './useFeed.js';
import { useFlash } from './useFlash.js';
import { detectPlatform, firstUrl, extractYouTubeId, extractTikTokId } from './urls.js';
import {
  useBookmarks, useArchive, getSetting,
  getSearchHistory, addSearchHistory, getPinnedSearches, togglePinnedSearch,
} from './storage.js';

// ---------- ユーティリティ ----------

function relevanceScore(video, q) {
  let score = 0;
  const title = (video.title || '').toLowerCase();
  const desc = (video.description || '').toLowerCase();
  const lq = q.toLowerCase();
  if (title.includes('撮可')) score += 30;
  if (title.includes('きゅるして') || title.includes('きゅるりん')) score += 20;
  if (lq && title.includes(lq)) score += 25;
  if (lq && desc.includes(lq)) score += 10;
  const daysOld = (Date.now() - new Date(video.publishedAt).getTime()) / 86400000;
  if (daysOld < 7) score += 20;
  else if (daysOld < 30) score += 10;
  return score;
}

function sortResults(items, mode, q) {
  if (mode === 'score') return [...items].sort((a, b) => (b.takaScore ?? -1) - (a.takaScore ?? -1));
  if (mode === 'date') return [...items].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  return [...items].sort((a, b) => relevanceScore(b, q) - relevanceScore(a, q));
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

// SNS 検索のセッションキャッシュ（検索 API の無料枠を節約）
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

async function fetchJsonWithTimeout(url, options = {}, ms = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    let data = null;
    try { data = await res.json(); } catch { /* 非 JSON */ }
    return { res, data };
  } finally {
    clearTimeout(timer);
  }
}

// URL の投稿情報から Gemini でメンバー・曲・会場を推定する（AI自動登録）
async function aiExtractClipInfo({ url, title, authorName }) {
  try {
    const { res, data } = await fetchJsonWithTimeout('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, title, authorName }),
    }, 12000);
    if (!res.ok || !data) return null;
    const validMember = MEMBERS_FILTER.some(m => m.id === data.member && m.id !== 'all') ? data.member : null;
    const s = (v) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 60) : null);
    return { member: validMember, song: s(data.song), venue: s(data.venue), label: s(data.label) };
  } catch {
    return null;
  }
}

// ---------- 定義 ----------

const PLATFORMS = ['youtube', 'x', 'tiktok', 'instagram'];
const SNS_PLATFORMS = ['x', 'tiktok', 'instagram'];
const PLATFORM_TABS = [
  { id: 'youtube',   label: 'YouTube' },
  { id: 'x',         label: 'X' },
  { id: 'tiktok',    label: 'TikTok' },
  { id: 'instagram', label: 'Insta' },
];

const emptyPlat = () => ({ items: [], loading: false, error: null, notConfigured: false, fetched: false });
const emptyAll = () => Object.fromEntries(PLATFORMS.map(p => [p, emptyPlat()]));

export default function SearchTab({ sharedUrl }) {
  const [query, setQuery] = useState('');
  const [memberFilter, setMemberFilter] = useState('all');
  const [venueFilter, setVenueFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('youtube');
  const [plat, setPlat] = useState(emptyAll);
  const [searched, setSearched] = useState(false);
  const [lastQuery, setLastQuery] = useState('');
  const [sortMode, setSortMode] = useState('score');
  const [contentFilter, setContentFilter] = useState('all');
  const [embedItem, setEmbedItem] = useState(null);
  const [history, setHistory] = useState(getSearchHistory);
  const [pinned, setPinned] = useState(getPinnedSearches);
  const reqIds = useRef({}); // プラットフォームごとの最新リクエスト番号（古い応答で上書きしない）

  const { toggle: toggleBookmark, has: isBookmarked } = useBookmarks();
  const { toggle: toggleArchive, add: addArchive, has: isArchived } = useArchive();

  // Web Share Target / URL貼り付け用アーカイブフォーム
  const [archiveOpen, setArchiveOpen] = useState(() => !!sharedUrl);
  const [archiveUrl, setArchiveUrl] = useState(() => sharedUrl || '');
  const [sharedNotice, setSharedNotice] = useState(() => !!sharedUrl);
  const [archiveMember, setArchiveMember] = useState('');
  const [archiveNote, setArchiveNote] = useState('');
  const [archiveSaving, setArchiveSaving] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(() => getSetting('aiDefault'));
  const [archiveMsg, flashArchive] = useFlash();

  const filtersFrom = ({ member = memberFilter, venue = venueFilter, period = periodFilter } = {}) => ({
    member: member !== 'all' ? member : null,
    venue: venue || null,
    period,
  });

  const setPlatState = (p, patch) => setPlat(prev => ({ ...prev, [p]: { ...prev[p], ...patch } }));
  const nextReq = (p) => (reqIds.current[p] = (reqIds.current[p] || 0) + 1);

  // ---------- 検索実行 ----------

  const fetchYouTube = async (q, filters) => {
    const id = nextReq('youtube');
    setPlatState('youtube', { items: [], loading: true, error: null, fetched: true });
    try {
      const items = await fetchYouTubeSearch({ userInput: q, filters, order: 'relevance' });
      if (reqIds.current.youtube !== id) return;
      setPlatState('youtube', { items, loading: false });
    } catch (err) {
      if (reqIds.current.youtube !== id) return;
      setPlatState('youtube', {
        items: [], loading: false,
        error: err.quota
          ? '本日の YouTube 検索回数の上限に達しました。時間をおいて再度お試しください'
          : '検索に失敗しました。時間をおいて再度お試しください',
      });
    }
  };

  const fetchSns = async (p, q, filters) => {
    const id = nextReq(p);
    const cacheKey = `${p}_${q}_${filters.member || ''}`;
    const cached = readSnsCache(cacheKey);
    if (cached) {
      setPlatState(p, { items: cached, loading: false, error: null, notConfigured: false, fetched: true });
      return;
    }
    setPlatState(p, { items: [], loading: true, error: null, notConfigured: false, fetched: true });
    try {
      const { res, data } = await fetchJsonWithTimeout('/api/sns-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: p, userInput: q, filters }),
      }, 20000);
      if (reqIds.current[p] !== id) return;
      if (res.status === 501) {
        setPlatState(p, { items: [], loading: false, notConfigured: true });
        return;
      }
      if (!res.ok || !data) throw new Error(data?.message || 'failed');
      const items = Array.isArray(data.items) ? data.items : [];
      writeSnsCache(cacheKey, items);
      setPlatState(p, { items, loading: false });
    } catch (err) {
      if (reqIds.current[p] !== id) return;
      setPlatState(p, {
        items: [], loading: false,
        error: /上限|quota/i.test(String(err.message || ''))
          ? '検索回数の上限に達しました。時間をおいて試すか、外部アプリで検索してください'
          : '検索に失敗しました。外部アプリでの検索もお試しください',
      });
    }
  };

  const fetchPlatform = (p, q, filters) => (p === 'youtube' ? fetchYouTube(q, filters) : fetchSns(p, q, filters));

  // 条件変更：影響するプラットフォームの結果を破棄し、表示中のタブだけ取り直す（他は開いた時に取得）
  const refetch = (affected, filters, q = lastQuery) => {
    if (!searched) return;
    affected.forEach(p => nextReq(p)); // 進行中の古い応答を無効化
    setPlat(prev => {
      const next = { ...prev };
      for (const p of affected) next[p] = emptyPlat();
      return next;
    });
    if (affected.includes(activeTab)) fetchPlatform(activeTab, q, filters);
  };

  const doSearch = (q) => {
    if (q.trim()) {
      addSearchHistory(q);
      setHistory(getSearchHistory());
    }
    setSearched(true);
    setLastQuery(q);
    setContentFilter('all');
    PLATFORMS.forEach(nextReq);
    setPlat(emptyAll());
    fetchPlatform(activeTab, q, filtersFrom());
  };

  const handleSearch = () => {
    const url = firstUrl(query);
    if (url && detectPlatform(url)) {
      setArchiveOpen(true);
      setArchiveUrl(url);
      setQuery('');
      flashArchive('URLを検出しました。「保存する」でアーカイブに登録できます', 'info');
      return;
    }
    doSearch(query);
  };

  const switchTab = (p) => {
    setActiveTab(p);
    if (searched && !plat[p].fetched && !plat[p].loading) fetchPlatform(p, lastQuery, filtersFrom());
  };

  const selectMember = (id) => {
    setMemberFilter(id);
    // SNS 検索はサーバー側で絞り込むため取り直す（YouTube はクライアント側で絞り込む）
    refetch(SNS_PLATFORMS, filtersFrom({ member: id }));
  };

  const changeVenue = (v) => {
    setVenueFilter(v);
    refetch(['youtube'], filtersFrom({ venue: v }));
  };

  const changePeriod = (v) => {
    setPeriodFilter(v);
    refetch(['youtube'], filtersFrom({ period: v }));
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
      ...(item.platform === 'tiktok' ? { tiktokVideoId: item.tiktokVideoId || extractTikTokId(item.url) } : {}),
    });
  };

  // 外部アプリで開くリンク（タブごと）
  const curFilters = filtersFrom();
  const topic = [curFilters.member ? (MEMBER_ALIASES[curFilters.member]?.[0] || curFilters.member) : '', lastQuery || query].filter(Boolean).join(' ');
  const externalUrl = {
    youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${topic} きゅるして 撮可`.trim())}`,
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
        flashArchive('クリップボードのURLを貼り付けました', 'ok');
      } else if (text) {
        setArchiveUrl(text.trim());
        flashArchive('URLを確認して「保存する」を押してください', 'warn');
      } else {
        flashArchive('クリップボードが空です', 'warn');
      }
    } catch {
      flashArchive('クリップボードを読み取れませんでした。入力欄を長押しして貼り付けてください', 'warn');
    }
  };

  const saveToArchive = async () => {
    if (archiveSaving) return;
    const raw = archiveUrl.trim();
    const url = firstUrl(raw) || raw;
    const platform = detectPlatform(url);
    if (!platform) {
      flashArchive('X・TikTok・Instagram・YouTube の URL を入力してください', 'warn');
      return;
    }
    if (isArchived(url)) {
      flashArchive('このURLはすでにアーカイブ済みです', 'info');
      return;
    }

    setArchiveSaving(true);
    try {
      const entry = {
        url,
        platform,
        member: archiveMember || null,
        note: archiveNote.trim() || null,
        videoId: platform === 'youtube' ? extractYouTubeId(url) : null,
      };
      if (platform !== 'instagram') {
        try {
          const { res, data: oe } = await fetchJsonWithTimeout(`/api/oembed?url=${encodeURIComponent(url)}&platform=${platform}`, {}, 10000);
          if (res.ok && oe) {
            entry.title = oe.title || null;
            entry.authorName = oe.authorName || null;
            entry.thumbnailUrl = oe.thumbnailUrl || null;
            if (platform === 'tiktok') {
              entry.tiktokVideoId = oe.videoId || extractTikTokId(url);
              if (oe.resolvedUrl) entry.url = oe.resolvedUrl; // 短縮 URL は実 URL に置き換えて保存
            }
          }
        } catch { /* oEmbed 失敗は致命的ではない */ }
      }

      let aiUsed = false;
      if (aiEnabled) {
        flashArchive('🤖 AIがクリップ情報を解析中…', 'info', 0);
        const ai = await aiExtractClipInfo({ url, title: entry.title, authorName: entry.authorName });
        if (ai) {
          if (!entry.member && ai.member) entry.member = ai.member;
          entry.song = ai.song;
          entry.venue = ai.venue;
          if (!entry.note && ai.label) entry.note = ai.label;
          aiUsed = !!(ai.member || ai.song || ai.venue || ai.label);
          entry.aiDetected = aiUsed;
        }
      }

      if (!addArchive(entry)) {
        flashArchive('このクリップはすでにアーカイブ済みです', 'info');
        return;
      }
      setArchiveUrl('');
      setArchiveNote('');
      setArchiveMember('');
      setSharedNotice(false);
      flashArchive(aiUsed ? '✅ アーカイブしました！（AIがメンバー・曲を自動判定）' : '✅ アーカイブしました！「みんなの撮可」で見られます', 'ok');
    } finally {
      setArchiveSaving(false);
    }
  };

  // ---------- レンダリング ----------

  const cur = plat[activeTab];
  const ytVisible = filterByContent(filterByMember(sortResults(plat.youtube.items, sortMode, lastQuery), memberFilter), contentFilter);
  const shownCount = activeTab === 'youtube' ? ytVisible.length : cur.items.length;
  const canSave = !archiveSaving && !!archiveUrl.trim();

  return (
    <div>
      {embedItem && <EmbedModal item={embedItem} onClose={() => setEmbedItem(null)} />}

      <PageHead title="撮可をさがす" desc="YouTube・X・TikTok・Instagram をまとめて検索" />

      {sharedNotice && (
        <div className="notice notice-ok" style={{ marginBottom: 12 }}>
          📥 共有されたURLを受け取りました。下の「保存する」でアーカイブに登録できます
        </div>
      )}

      {/* 検索窓 */}
      <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} style={{ position: 'relative', marginBottom: 10 }}>
        <Icon name="search" size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="search"
          enterKeyHint="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="例：うたちゃん 幕張（URLを貼ると保存）"
          className="input"
          style={{ padding: '15px 92px 15px 44px', fontSize: 15, borderRadius: 999, boxShadow: 'var(--shadow-sm)' }}
        />
        <button type="submit" className="btn btn-primary"
          style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', padding: '10px 18px' }}>
          検索
        </button>
      </form>

      {/* ピン留め・履歴 */}
      {(pinned.length > 0 || history.length > 0) && (
        <div className="chip-scroll" style={{ marginBottom: 12 }}>
          {pinned.map(q => (
            <span key={'pin_' + q} className="chip chip-sm" style={{ background: 'var(--warn-soft)', borderColor: 'transparent', color: 'var(--warn)', padding: 0 }}>
              <button onClick={() => runQuick(q)} style={{ padding: '4px 4px 4px 11px', fontWeight: 700 }}>{q}</button>
              <button onClick={() => togglePin(q)} title="ピン留め解除" aria-label={`${q} のピン留めを解除`} style={{ padding: '4px 9px 4px 2px', display: 'flex' }}>
                <Icon name="star" size={13} filled />
              </button>
            </span>
          ))}
          {history.filter(q => !pinned.includes(q)).slice(0, 5).map(q => (
            <span key={'his_' + q} className="chip chip-sm" style={{ padding: 0 }}>
              <button onClick={() => runQuick(q)} style={{ padding: '4px 4px 4px 10px', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                <Icon name="clock" size={12} />{q}
              </button>
              <button onClick={() => togglePin(q)} title="ピン留め" aria-label={`${q} をピン留め`} style={{ padding: '4px 9px 4px 2px', display: 'flex', color: 'var(--text-muted)' }}>
                <Icon name="star" size={13} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* メンバー */}
      <div className="chip-scroll" style={{ marginBottom: 12 }}>
        {MEMBERS_FILTER.map(m => (
          <button key={m.id} onClick={() => selectMember(m.id)}
            className={`chip${memberFilter === m.id ? ' is-active' : ''}`} style={chipVars(m.memberId)}>
            <span>{m.emoji}</span>{m.label}
          </button>
        ))}
      </div>

      {/* プラットフォームタブ */}
      <div className="seg" role="tablist" style={{ marginBottom: 12 }}>
        {PLATFORM_TABS.map(t => (
          <button key={t.id} role="tab" aria-selected={activeTab === t.id} aria-label={PLATFORM_CONFIG[t.id].label} onClick={() => switchTab(t.id)}
            className={`seg-btn${activeTab === t.id ? ' is-active' : ''}`}>
            {PLATFORM_CONFIG[t.id].tag ? (
              <span style={{ fontSize: 14, fontWeight: 800 }}>{PLATFORM_CONFIG[t.id].tag}</span>
            ) : (
              <><span style={{ color: activeTab === t.id ? PLATFORM_CONFIG[t.id].color : undefined, marginRight: 3 }}>{PLATFORM_CONFIG[t.id].icon}</span>{t.label}</>
            )}
          </button>
        ))}
      </div>

      {/* 会場・期間（YouTube タブのみ） */}
      {activeTab === 'youtube' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <select value={venueFilter} onChange={e => changeVenue(e.target.value)} className="select" aria-label="会場">
            {VENUES_FILTER.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
          <select value={periodFilter} onChange={e => changePeriod(e.target.value)} className="select" aria-label="期間">
            {PERIODS_FILTER.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
      )}

      {/* URL アーカイブ（AI 自動登録） */}
      <div className="card" style={{ marginBottom: 6, overflow: 'hidden' }}>
        <button onClick={() => setArchiveOpen(o => !o)} aria-expanded={archiveOpen}
          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '13px 16px', textAlign: 'left' }}>
          <span style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📥</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 800 }}>URLをアーカイブ</span>
            <span style={{ display: 'block', fontSize: 10.5, color: 'var(--text-sub)', marginTop: 1 }}>XやTikTokのリンクを貼るだけ・🤖AIが自動判定</span>
          </span>
          <Icon name="chevron" size={16} style={{ color: 'var(--text-muted)', transform: archiveOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s var(--ease)' }} />
        </button>
        {archiveOpen && (
          <div style={{ padding: '0 16px 16px', animation: 'pageIn 0.2s var(--ease)' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                type="url"
                inputMode="url"
                value={archiveUrl}
                onChange={e => setArchiveUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveToArchive()}
                placeholder="https://x.com/... / tiktok.com/... / youtu.be/..."
                className="input"
                style={{ fontSize: 13 }}
              />
              <button onClick={pasteFromClipboard} title="クリップボードから貼り付け" aria-label="クリップボードから貼り付け"
                className="icon-btn" style={{ width: 44, height: 44, borderRadius: 14 }}>
                <Icon name="clipboard" size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <select value={archiveMember} onChange={e => setArchiveMember(e.target.value)} className="select" aria-label="メンバー">
                <option value="">メンバー（AIが自動判定）</option>
                {MEMBERS_FILTER.filter(m => m.id !== 'all').map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
              <input type="text" value={archiveNote} onChange={e => setArchiveNote(e.target.value)}
                placeholder="メモ（任意）" maxLength={100} className="input" style={{ fontSize: 12.5 }} />
            </div>
            <button onClick={saveToArchive} disabled={!canSave} className="btn btn-primary btn-block" style={{ padding: 12, marginBottom: 10 }}>
              {archiveSaving ? '🤖 解析中…' : '保存する'}
            </button>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'var(--text-sub)', cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={aiEnabled} onChange={e => setAiEnabled(e.target.checked)} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
              🤖 AIでメンバー・曲・会場を自動判定して登録する
            </label>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.6 }}>
              📲 Android版アプリなら、XやTikTokの共有シートから「TORCA」を選ぶだけで自動入力されます
            </div>
            <Notice msg={archiveMsg} style={{ marginTop: 10 }} />
          </div>
        )}
      </div>

      {/* ================= 結果エリア ================= */}

      {!searched && (
        <EmptyState icon="🎬" title="キーワードひとつで4つのSNSを横断検索">
          例：「あむちゃん 幕張」「やねぴ ソロ」
        </EmptyState>
      )}

      {searched && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '16px 2px 10px' }}>
          <span style={{ fontSize: 12, color: 'var(--text-sub)', fontWeight: 700 }}>
            {!cur.loading && shownCount > 0 && `${shownCount}件`}
          </span>
          <a href={externalUrl} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11.5, color: 'var(--accent-deep)', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {PLATFORM_CONFIG[activeTab].label}で開く <Icon name="external" size={13} />
          </a>
        </div>
      )}

      {cur.loading && <Spinner label={`${PLATFORM_CONFIG[activeTab].label} を検索中…`} />}

      {/* エラー / 未設定 */}
      {searched && !cur.loading && cur.error && (
        <div className="notice notice-err">{cur.error}</div>
      )}
      {searched && !cur.loading && cur.notConfigured && (
        <div className="card">
          <EmptyState icon="🔧" title="SNS横断検索は準備中です"
            actions={<a href={externalUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              {PLATFORM_CONFIG[activeTab].icon} {PLATFORM_CONFIG[activeTab].label}で検索 <Icon name="external" size={14} />
            </a>}>
            運営向け：Vercel の環境変数に <code>TAVILY_API_KEY</code> を<br />設定すると有効になります（app.tavily.com で無料取得）
          </EmptyState>
        </div>
      )}

      {/* YouTube 結果 */}
      {searched && activeTab === 'youtube' && !cur.loading && !cur.error && plat.youtube.items.length > 0 && (
        <>
          <div className="chip-scroll" style={{ marginBottom: 10 }}>
            {[{ id: 'score', label: '📸 スコア順' }, { id: 'date', label: '新しい順' }, { id: 'relevance', label: '関連度' }].map(s => (
              <button key={s.id} onClick={() => setSortMode(s.id)} className={`chip chip-sm${sortMode === s.id ? ' is-active' : ''}`}>
                {s.label}
              </button>
            ))}
            <span style={{ width: 1, background: 'var(--border-strong)', margin: '4px 2px', flexShrink: 0 }} />
            {[{ id: 'taka', label: '撮可のみ' }, { id: 'official', label: '公式のみ' }].map(f => (
              <button key={f.id} onClick={() => setContentFilter(contentFilter === f.id ? 'all' : f.id)}
                className={`chip chip-sm${contentFilter === f.id ? ' is-active' : ''}`}>
                {f.label}
              </button>
            ))}
          </div>
          {ytVisible.map((video, i) => (
            <ClipRow key={video.videoId} video={video} queue={ytVisible} queueIndex={i}
              bookmarked={isBookmarked(video.videoId)} onToggleBookmark={toggleBookmark} />
          ))}
          {ytVisible.length === 0 && (
            <EmptyState icon="🔍" title="このフィルターに該当する動画がありません">
              メンバーや「撮可のみ」の絞り込みを外してみてください
            </EmptyState>
          )}
        </>
      )}

      {/* SNS 結果（X / TikTok / Instagram） */}
      {searched && activeTab !== 'youtube' && !cur.loading && !cur.error && !cur.notConfigured && cur.items.length > 0 && (
        <>
          {cur.items.map(item => (
            <SnsRow key={item.url} item={item}
              platformConfig={PLATFORM_CONFIG[item.platform] || PLATFORM_CONFIG[activeTab]}
              saved={isArchived(item.url)}
              onToggleSave={saveSnsResult}
              onOpen={setEmbedItem} />
          ))}
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.6, padding: '4px 2px' }}>
            💡 検索結果は検索エンジンのインデックスに基づくため、最新の投稿は「{PLATFORM_CONFIG[activeTab].label}で開く」も併用してください
          </div>
        </>
      )}

      {/* 0件 */}
      {searched && !cur.loading && !cur.error && !cur.notConfigured && cur.fetched && cur.items.length === 0 && (
        <EmptyState icon="🔍" title="見つかりませんでした">
          キーワードを変えるか、<a href={externalUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-deep)', fontWeight: 700 }}>{PLATFORM_CONFIG[activeTab].label}で直接検索</a>してみてください
        </EmptyState>
      )}
    </div>
  );
}
