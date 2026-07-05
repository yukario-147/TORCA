// src/SearchTab.jsx
// 検索タブ：YouTube 並列検索 + AI スコアリング + SNS 導線 + URL の AI 自動登録

import { useState } from 'react';
import { buildQuery, buildSnsUrls, buildXRecipes, buildTagLinks, MEMBER_ALIASES } from './searchDict.js';
import { MEMBERS_FILTER, VENUES_FILTER, PERIODS_FILTER, SNS_PLATFORMS } from './data.js';
import { ClipRow } from './components.jsx';
import {
  useBookmarks, loadJSON, saveJSON, KEYS,
  getSetting, getSearchHistory, addSearchHistory, getPinnedSearches, togglePinnedSearch,
} from './storage.js';

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
  if (mode === 'score') {
    return [...items].sort((a, b) => (b.takaScore ?? -1) - (a.takaScore ?? -1));
  } else if (mode === 'date') {
    return [...items].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  } else {
    return [...items].sort((a, b) => scoreVideo(b, q) - scoreVideo(a, q));
  }
}

function filterByContent(items, filter) {
  if (filter === 'taka') return items.filter(v => (v.takaScore ?? 0) >= 60 && !v.isOfficial);
  if (filter === 'official') return items.filter(v => v.isOfficial === true);
  return items;
}

// メンバー名・ニックネームをタイトル/説明で照合してポストフィルタリング
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

// YouTube URL から videoId を抽出（watch / youtu.be / shorts 対応）
function extractYouTubeId(url) {
  const m = (url || '').match(/(?:youtube\.com\/(?:watch\?.*v=|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

export default function SearchTab({ sharedUrl }) {
  const [query, setQuery] = useState('');
  const [memberFilter, setMemberFilter] = useState('all');
  const [venueFilter, setVenueFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [activePlatforms, setActivePlatforms] = useState(['youtube', 'x', 'tiktok', 'instagram']);
  const [sortMode, setSortMode] = useState('score');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [snsUrls, setSnsUrls] = useState({});
  const [detectedInfo, setDetectedInfo] = useState(null);
  const { toggle: toggleBookmark, has: isBookmarked } = useBookmarks();
  // Web Share Target：X / TikTok アプリの共有シートから渡された URL があれば
  // アーカイブ欄を開いた状態で初期化する
  const [archiveOpen, setArchiveOpen] = useState(() => !!sharedUrl);
  const [archiveUrl, setArchiveUrl] = useState(() => sharedUrl || '');
  const [archiveMember, setArchiveMember] = useState('');
  const [archiveNote, setArchiveNote] = useState('');
  const [archiveSaving, setArchiveSaving] = useState(false);
  const [archiveMsg, setArchiveMsg] = useState('');
  const [aiEnabled, setAiEnabled] = useState(() => getSetting('aiDefault'));
  const [contentFilter, setContentFilter] = useState('all');
  const [searchStats, setSearchStats] = useState(null);
  const [history, setHistory] = useState(getSearchHistory);
  const [pinned, setPinned] = useState(getPinnedSearches);


  const togglePlatform = (id) => {
    setActivePlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const doSearch = async (overrideQuery) => {
    const q = overrideQuery ?? query;
    const filters = {
      member: memberFilter !== 'all' ? memberFilter : null,
      venue: venueFilter || null,
      period: periodFilter,
    };

    const { snsQuery, detectedMembers, detectedVenues } = buildQuery(q, filters);
    const snsLinks = buildSnsUrls(snsQuery, activePlatforms);

    if (q.trim()) {
      addSearchHistory(q);
      setHistory(getSearchHistory());
    }

    setSnsUrls(snsLinks);
    setDetectedInfo({ detectedMembers, detectedVenues, youtubeQuery: q });
    setLoading(true);
    setError('');
    setSearched(true);
    setContentFilter('all');
    setSearchStats(null);

    try {
      const res = await fetch('/api/youtube-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput: q,
          filters,
          order: sortMode === 'date' ? 'date' : 'relevance',
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Search failed');

      setSearchStats({
        totalQueried: data.totalQueried || 0,
        totalDeduplicated: data.totalDeduplicated || 0,
        geminiUsed: !!data.geminiUsed,
      });

      const sorted = sortResults(data.items || [], sortMode, q);
      setResults(sorted);
    } catch (err) {
      setError('検索に失敗しました。しばらくしてからもう一度お試しください。');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setResults([]);
    doSearch();
  };

  // 履歴・ピン留めチップからのワンタップ再検索
  const runQuick = (q) => {
    setQuery(q);
    setResults([]);
    doSearch(q);
  };

  const togglePin = (q) => {
    setPinned(togglePinnedSearch(q));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const detectPlatform = (url) => {
    if (url.includes('x.com') || url.includes('twitter.com')) return 'x';
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    return null;
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
      thumbnailUrl: null,
      title: null,
      authorName: null,
      song: null,
      venue: null,
      aiDetected: false,
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
        }
      } catch { /* oEmbed failure is non-critical */ }
    }

    // AI 自動登録：メンバー・曲・会場を Gemini で推定して補完
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
    setArchiveMsg(aiUsed ? 'アーカイブしました！（AIがメンバー・曲を自動判定）' : 'アーカイブしました！');
    setArchiveSaving(false);
    setTimeout(() => setArchiveMsg(''), 4000);
  };

  return (
    <div style={{ padding: '0 0 80px 0' }}>
      <div style={{ padding: '20px 16px 0' }}>
        <h2 style={{
          fontSize: 20, fontWeight: 800, margin: '0 0 4px',
          background: 'linear-gradient(120deg, var(--accent-light), var(--accent2))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          撮可を探す
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
          YouTube検索 ＋ X / TikTok / Instagram への導線
        </p>

        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例：うたちゃんの幕張 / あむちゃんソロ / やねぴのダンスシーン"
            style={{
              width: '100%', padding: '14px 52px 14px 16px', borderRadius: 12,
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
              border: 'none', borderRadius: 8, padding: '8px 14px',
              color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >
            検索
          </button>
        </div>

        {/* ピン留め検索・検索履歴 */}
        {(pinned.length > 0 || history.length > 0) && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
            {pinned.map(q => (
              <span key={'pin_' + q} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 6px 4px 11px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
                color: '#fbbf24',
              }}>
                <span onClick={() => runQuick(q)} style={{ cursor: 'pointer' }}>{q}</span>
                <span onClick={() => togglePin(q)} title="ピン留め解除"
                  style={{ cursor: 'pointer', fontSize: 10, opacity: 0.85 }}>★</span>
              </span>
            ))}
            {history.filter(q => !pinned.includes(q)).slice(0, 6).map(q => (
              <span key={'his_' + q} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 6px 4px 11px', borderRadius: 20, fontSize: 11,
                background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}>
                <span onClick={() => runQuick(q)} style={{ cursor: 'pointer' }}>🕐 {q}</span>
                <span onClick={() => togglePin(q)} title="ピン留め"
                  style={{ cursor: 'pointer', fontSize: 10, opacity: 0.6 }}>☆</span>
              </span>
            ))}
          </div>
        )}

        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>メンバー</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {MEMBERS_FILTER.map(m => (
              <button
                key={m.id}
                onClick={() => setMemberFilter(m.id)}
                style={{
                  padding: '5px 12px', borderRadius: 20,
                  border: memberFilter === m.id ? `1.5px solid ${m.color || 'var(--accent)'}` : '1.5px solid var(--border-subtle)',
                  background: memberFilter === m.id ? `${m.color || 'var(--accent)'}22` : 'var(--bg-card)',
                  color: memberFilter === m.id ? (m.color || 'var(--accent)') : 'var(--text-secondary)',
                  fontSize: 12, fontWeight: memberFilter === m.id ? 700 : 400,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <select
            value={venueFilter}
            onChange={e => setVenueFilter(e.target.value)}
            style={{
              padding: '7px 10px', borderRadius: 8, border: '1.5px solid var(--border-subtle)',
              background: 'var(--bg-card)', color: 'var(--text-secondary)',
              fontSize: 12, cursor: 'pointer', flex: 1, minWidth: 140,
            }}
          >
            {VENUES_FILTER.map(v => (
              <option key={v.id} value={v.id}>{v.label}</option>
            ))}
          </select>
          <select
            value={periodFilter}
            onChange={e => setPeriodFilter(e.target.value)}
            style={{
              padding: '7px 10px', borderRadius: 8, border: '1.5px solid var(--border-subtle)',
              background: 'var(--bg-card)', color: 'var(--text-secondary)',
              fontSize: 12, cursor: 'pointer', flex: 1, minWidth: 120,
            }}
          >
            {PERIODS_FILTER.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>検索先SNS</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SNS_PLATFORMS.map(p => (
              <button
                key={p.id}
                onClick={() => togglePlatform(p.id)}
                style={{
                  padding: '5px 12px', borderRadius: 20,
                  border: activePlatforms.includes(p.id) ? `1.5px solid ${p.color}` : '1.5px solid var(--border-subtle)',
                  background: activePlatforms.includes(p.id) ? `${p.color}22` : 'var(--bg-card)',
                  color: activePlatforms.includes(p.id) ? p.color : 'var(--text-secondary)',
                  fontSize: 12, fontWeight: activePlatforms.includes(p.id) ? 700 : 400,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* URL アーカイブ（AI 自動登録） */}
        <div style={{ marginBottom: 8 }}>
          <button
            onClick={() => setArchiveOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', fontSize: 11, padding: 0, fontWeight: 600,
            }}
          >
            <span style={{ transform: archiveOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>▶</span>
            X / TikTok / Instagram / YouTube の URL をアーカイブ（🤖 AI自動登録）
          </button>
          {archiveOpen && (
            <div style={{ marginTop: 10, padding: '12px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  type="url"
                  value={archiveUrl}
                  onChange={e => setArchiveUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveToArchive()}
                  placeholder="https://x.com/... / tiktok.com/... / youtu.be/..."
                  style={{
                    flex: 1, padding: '9px 12px', borderRadius: 8,
                    border: '1.5px solid var(--border-subtle)', background: '#0c0c12',
                    color: 'var(--text-primary)', fontSize: 13, outline: 'none',
                  }}
                />
                <button
                  onClick={saveToArchive}
                  disabled={archiveSaving}
                  style={{
                    padding: '9px 14px', borderRadius: 8, border: 'none',
                    background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                    color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                    whiteSpace: 'nowrap', opacity: archiveSaving ? 0.6 : 1,
                  }}
                >
                  {archiveSaving ? '解析中…' : '保存'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <select
                  value={archiveMember}
                  onChange={e => setArchiveMember(e.target.value)}
                  style={{
                    padding: '7px 10px', borderRadius: 8, border: '1.5px solid var(--border-subtle)',
                    background: '#0c0c12', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', flex: 1,
                  }}
                >
                  <option value="">メンバー（AIが自動判定）</option>
                  {MEMBERS_FILTER.filter(m => m.id !== 'all').map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={archiveNote}
                  onChange={e => setArchiveNote(e.target.value)}
                  placeholder="メモ（任意）"
                  style={{
                    flex: 1, padding: '7px 10px', borderRadius: 8,
                    border: '1.5px solid var(--border-subtle)', background: '#0c0c12',
                    color: 'var(--text-primary)', fontSize: 12, outline: 'none',
                  }}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={aiEnabled} onChange={e => setAiEnabled(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
                🤖 AIでメンバー・曲・会場を自動判定して登録する
              </label>
              {archiveMsg && (
                <div style={{
                  fontSize: 12, padding: '6px 10px', borderRadius: 8, marginTop: 8,
                  background: archiveMsg.includes('しました') || archiveMsg.includes('解析中')
                    ? 'rgba(16,185,129,0.15)' : 'rgba(231,76,60,0.15)',
                  color: archiveMsg.includes('しました') || archiveMsg.includes('解析中')
                    ? '#34d399' : '#e74c3c',
                }}>
                  {archiveMsg}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {searched && (() => {
        const filters = {
          member: memberFilter !== 'all' ? memberFilter : null,
          venue: venueFilter || null,
          period: periodFilter,
        };
        const recipes = buildXRecipes(detectedInfo?.youtubeQuery || query, filters);
        const tagLinks = buildTagLinks(detectedInfo?.youtubeQuery || query, filters);
        const linkChip = (color) => ({
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '5px 12px', borderRadius: 20,
          background: `${color}18`, border: `1px solid ${color}40`,
          color, fontSize: 11, fontWeight: 600, textDecoration: 'none',
        });
        return (
          <div style={{
            margin: '0 16px 16px', padding: '12px 14px', borderRadius: 10,
            background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
          }}>
            {/* X 検索レシピ：検索演算子で絞り込んだ実用リンク */}
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 700 }}>
              𝕏 で撮可を探す
              {detectedInfo?.detectedMembers?.length > 0 && (
                <span style={{ marginLeft: 8, color: 'var(--accent-light)', fontWeight: 400 }}>
                  📍 {detectedInfo.detectedMembers[0]}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {recipes.map(r => (
                <a key={r.label} href={r.url} target="_blank" rel="noopener noreferrer"
                  title={r.desc} style={linkChip('#1DA1F2')}>
                  {r.label} ↗
                </a>
              ))}
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 700 }}>
              タグページ・他のSNS
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {tagLinks.tiktok.map(t => (
                <a key={'tk' + t.label} href={t.url} target="_blank" rel="noopener noreferrer"
                  style={linkChip('#69C9D0')}>♪ {t.label} ↗</a>
              ))}
              {snsUrls.tiktok && (
                <a href={snsUrls.tiktok} target="_blank" rel="noopener noreferrer"
                  style={linkChip('#69C9D0')}>♪ TikTok検索 ↗</a>
              )}
              {tagLinks.instagram.map(t => (
                <a key={'ig' + t.label} href={t.url} target="_blank" rel="noopener noreferrer"
                  style={linkChip('#E1306C')}>◎ {t.label} ↗</a>
              ))}
              {snsUrls.youtube && (
                <a href={snsUrls.youtube} target="_blank" rel="noopener noreferrer"
                  style={linkChip('#FF0000')}>▶ YouTube検索 ↗</a>
              )}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.5 }}>
              💡 X・TikTokで見つけた撮可は、投稿の「共有」からTORCAに送るか、URLを下の「アーカイブ」に貼るとAIが自動整理します
            </div>
          </div>
        );
      })()}

      {searched && !loading && results.length > 0 && (
        <div style={{ padding: '0 16px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {filterByContent(filterByMember(results, memberFilter), contentFilter).length}件
                {memberFilter !== 'all' && <span style={{ marginLeft: 4, color: 'var(--accent-light)', fontSize: 11 }}>({memberFilter})</span>}
              </span>
              {searchStats && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                  {searchStats.totalQueried}件のクエリを並列実行 → {searchStats.totalDeduplicated}件をAIスコアリング
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {[{ id: 'score', label: '📸 スコア順' }, { id: 'date', label: '新しい順' }, { id: 'relevance', label: '関連度' }].map(s => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSortMode(s.id);
                    setResults(prev => sortResults([...prev], s.id, query));
                  }}
                  style={{
                    padding: '4px 10px', borderRadius: 20,
                    border: sortMode === s.id ? '1.5px solid var(--accent)' : '1.5px solid var(--border-subtle)',
                    background: sortMode === s.id ? 'rgba(224,64,160,0.15)' : 'transparent',
                    color: sortMode === s.id ? 'var(--accent-light)' : 'var(--text-secondary)',
                    fontSize: 11, fontWeight: sortMode === s.id ? 700 : 400, cursor: 'pointer',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { id: 'all', label: '全て' },
              { id: 'taka', label: '📸 撮可のみ' },
              { id: 'official', label: '🏷 公式のみ' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setContentFilter(f.id)}
                style={{
                  padding: '4px 12px', borderRadius: 20,
                  border: contentFilter === f.id ? '1.5px solid var(--accent)' : '1.5px solid var(--border-subtle)',
                  background: contentFilter === f.id ? 'rgba(224,64,160,0.15)' : 'transparent',
                  color: contentFilter === f.id ? 'var(--accent-light)' : 'var(--text-secondary)',
                  fontSize: 11, fontWeight: contentFilter === f.id ? 700 : 400, cursor: 'pointer',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
          <div style={{
            width: 32, height: 32,
            border: '3px solid var(--border-subtle)', borderTop: '3px solid var(--accent)',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ fontSize: 13 }}>複数のソースを横断検索中…</p>
        </div>
      )}

      {error && (
        <div style={{
          margin: '0 16px', padding: '12px 16px', borderRadius: 10,
          background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.3)',
          color: '#e74c3c', fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {!searched && !loading && (
        <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
          <p style={{ fontSize: 14, margin: 0 }}>メンバー名やニックネームで検索してみよう</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>例：「あむちゃん 幕張」「やねぴのソロ」</p>
        </div>
      )}

      {!loading && results.length > 0 && (() => {
        const visible = filterByContent(filterByMember(results, memberFilter), contentFilter);
        return (
          <div style={{ padding: '0 16px' }}>
            {visible.map((video, i) => (
              <ClipRow
                key={video.videoId}
                video={video}
                queue={visible}
                queueIndex={i}
                bookmarked={isBookmarked(video.videoId)}
                onToggleBookmark={toggleBookmark}
              />
            ))}
          </div>
        );
      })()}

      {searched && !loading && results.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
          <p style={{ fontSize: 14, margin: 0 }}>動画が見つかりませんでした</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>別のキーワードを試してみてください</p>
        </div>
      )}

      {searched && !loading && results.length > 0 &&
        filterByContent(filterByMember(results, memberFilter), contentFilter).length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔎</div>
          <p style={{ fontSize: 13, margin: 0 }}>
            {memberFilter !== 'all'
              ? `${memberFilter}の動画が見つかりませんでした`
              : 'このフィルターに該当する動画がありません'}
          </p>
          <p style={{ fontSize: 11, marginTop: 6, color: 'var(--text-muted)' }}>フィルターを変更してみてください</p>
        </div>
      )}
    </div>
  );
}
