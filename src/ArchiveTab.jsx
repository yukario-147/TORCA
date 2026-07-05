// src/ArchiveTab.jsx
// みんなの撮可：ブックマーク + 手動/AIアーカイブの一覧と、共有コードによるファン間共有

import { useState, useEffect } from 'react';
import { MEMBERS_FILTER, PLATFORM_CONFIG } from './data.js';
import { loadJSON, saveJSON, KEYS, buildShareCode, parseShareCode, mergeShareData } from './storage.js';
import { usePlayer } from './playerContext.js';
import { PlayAllButton } from './components.jsx';
import EmbedModal from './EmbedModal.jsx';

export default function ArchiveTab() {
  const [memberFilter, setMemberFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [sharePanel, setSharePanel] = useState(null); // null | 'export' | 'import'
  const [embedItem, setEmbedItem] = useState(null);

  // タイトル未取得の既存エントリを oEmbed で遡って補完する
  // （X のタイトル抽出・TikTok 短縮 URL 解決に対応する前に保存されたデータの修復）
  useEffect(() => {
    const arc = loadJSON(KEYS.archive, []);
    const targets = arc
      .filter(a => (a.platform === 'x' || a.platform === 'tiktok') && !a.title && !a.enrichTried)
      .slice(0, 5);
    if (targets.length === 0) return;
    let alive = true;
    (async () => {
      const updated = [...arc];
      for (const t of targets) {
        const i = updated.findIndex(a => a.id === t.id);
        if (i < 0) continue;
        updated[i] = { ...updated[i], enrichTried: true };
        try {
          const r = await fetch(`/api/oembed?url=${encodeURIComponent(t.url)}&platform=${t.platform}`);
          const oe = r.ok ? await r.json() : null;
          if (oe) {
            updated[i] = {
              ...updated[i],
              title: oe.title || updated[i].title,
              authorName: oe.authorName || updated[i].authorName,
              thumbnailUrl: updated[i].thumbnailUrl || oe.thumbnailUrl || null,
              ...(t.platform === 'tiktok' && oe.videoId ? { tiktokVideoId: oe.videoId } : {}),
              ...(oe.resolvedUrl ? { url: oe.resolvedUrl } : {}),
            };
          }
        } catch { /* 補完失敗は無視（enrichTried で再試行を防ぐ） */ }
      }
      if (!alive) return;
      saveJSON(KEYS.archive, updated);
      setRefreshKey(k => k + 1);
    })();
    return () => { alive = false; };
  }, []);
  const [shareCode, setShareCode] = useState('');
  const [importCode, setImportCode] = useState('');
  const [shareMsg, setShareMsg] = useState('');

  const rawBookmarks = loadJSON(KEYS.bookmarks, []);
  const bookmarks = rawBookmarks.map(b => ({
    id: 'yt_' + b.videoId,
    platform: 'youtube',
    url: `https://www.youtube.com/watch?v=${b.videoId}`,
    title: b.title,
    authorName: b.channelTitle,
    thumbnailUrl: b.thumbnailUrl || b.thumbnail,
    member: null,
    note: null,
    savedAt: b.savedAt || new Date().toISOString(),
    videoId: b.videoId,
    shared: !!b.shared,
  }));

  const archive = loadJSON(KEYS.archive, []);

  const allItems = [...bookmarks, ...archive].sort((a, b) =>
    new Date(b.savedAt) - new Date(a.savedAt)
  );

  const filtered = allItems.filter(item => {
    if (memberFilter !== 'all' && item.member !== memberFilter) return false;
    if (platformFilter !== 'all' && item.platform !== platformFilter) return false;
    return true;
  });

  // YouTube ブックマークをアプリ内プレイヤーのプレイリストに変換
  const player = usePlayer();
  const playQueue = filtered
    .filter(item => item.videoId)
    .map(item => ({
      videoId: item.videoId,
      title: item.title || item.note || item.url,
      channelTitle: item.authorName || '',
      thumbnailUrl: item.thumbnailUrl || '',
      publishedAt: '',
    }));

  // タップ時の挙動：YouTube → 撮可シアター / X・TikTok → アプリ内埋め込み / それ以外 → 外部リンク
  const openItem = (item, e) => {
    if (item.videoId && player) {
      e.preventDefault();
      const idx = playQueue.findIndex(q => q.videoId === item.videoId);
      player.openPlayer(playQueue, Math.max(0, idx));
      return;
    }
    if (item.platform === 'x' || item.platform === 'tiktok') {
      e.preventDefault();
      setEmbedItem(item);
    }
  };

  const removeItem = (item) => {
    if (item.platform === 'youtube') {
      const bms = loadJSON(KEYS.bookmarks, []);
      saveJSON(KEYS.bookmarks, bms.filter(b => b.videoId !== item.videoId));
    } else {
      const arc = loadJSON(KEYS.archive, []);
      saveJSON(KEYS.archive, arc.filter(a => a.id !== item.id));
    }
    setRefreshKey(k => k + 1);
  };

  const memberLabel = (memberId) => {
    if (!memberId) return null;
    return MEMBERS_FILTER.find(m => m.id === memberId);
  };

  const openExport = () => {
    if (allItems.length === 0) {
      setShareMsg('共有できるアーカイブがまだありません');
      setTimeout(() => setShareMsg(''), 3000);
      return;
    }
    const code = buildShareCode({ bookmarks: rawBookmarks, archive });
    setShareCode(code);
    setSharePanel(sharePanel === 'export' ? null : 'export');
    setShareMsg('');
  };

  const copyShareCode = async () => {
    try {
      await navigator.clipboard.writeText(shareCode);
      setShareMsg('共有コードをコピーしました！Xやディスコでファン仲間に送ろう 💗');
    } catch {
      setShareMsg('コピーできませんでした。コードを選択して手動でコピーしてください');
    }
    setTimeout(() => setShareMsg(''), 4000);
  };

  const shareViaOS = async () => {
    if (!navigator.share) return copyShareCode();
    try {
      await navigator.share({
        title: 'TORCA 撮可アーカイブ',
        text: `きゅるして撮可アーカイブの共有コードだよ！TORCAの「みんなの撮可」で取り込んでね💗\n\n${shareCode}`,
      });
    } catch { /* ユーザーキャンセルは無視 */ }
  };

  const doImport = () => {
    try {
      const parsed = parseShareCode(importCode);
      const added = mergeShareData(parsed);
      setImportCode('');
      setShareMsg(added > 0 ? `🎉 ${added}件のクリップを取り込みました！` : 'すべて登録済みでした（新しいクリップはありません）');
      setRefreshKey(k => k + 1);
    } catch (err) {
      setShareMsg(err.message);
    }
    setTimeout(() => setShareMsg(''), 5000);
  };

  const shareBtnStyle = (active) => ({
    flex: 1, padding: '8px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700,
    border: active ? '1.5px solid var(--accent)' : '1.5px solid var(--border-subtle)',
    background: active ? 'rgba(224,64,160,0.15)' : 'var(--bg-card)',
    color: active ? 'var(--accent-light)' : 'var(--text-secondary)',
    cursor: 'pointer', transition: 'all 0.2s',
  });

  return (
    <div key={refreshKey} style={{ padding: '0 0 80px 0' }}>
      {embedItem && <EmbedModal item={embedItem} onClose={() => setEmbedItem(null)} />}
      <div style={{ padding: '16px 16px 0' }}>
        <h2 style={{
          fontSize: 20, fontWeight: 800, margin: '0 0 4px',
          background: 'linear-gradient(120deg, var(--accent-light), var(--accent2))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>みんなの撮可</h2>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>
          共有コードでファン同士のアーカイブを交換できます。データは端末内にのみ保存されます。
        </p>

        {/* 共有コード */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <button onClick={openExport} style={shareBtnStyle(sharePanel === 'export')}>
            📤 共有コードを作成
          </button>
          <button
            onClick={() => { setSharePanel(sharePanel === 'import' ? null : 'import'); setShareMsg(''); }}
            style={shareBtnStyle(sharePanel === 'import')}
          >
            📥 コードを取り込む
          </button>
        </div>

        {sharePanel === 'export' && (
          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.6 }}>
              このコードをファン仲間に送ると、あなたのアーカイブ（最新100件まで）を相手のTORCAに取り込めます。
            </div>
            <textarea
              readOnly
              value={shareCode}
              onFocus={e => e.target.select()}
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8,
                border: '1.5px solid var(--border-subtle)', background: '#0c0c12',
                color: 'var(--text-secondary)', fontSize: 10, outline: 'none', resize: 'vertical',
                fontFamily: 'monospace', wordBreak: 'break-all',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={copyShareCode} style={{
                flex: 1, padding: '8px', borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer',
              }}>コピー</button>
              {typeof navigator !== 'undefined' && !!navigator.share && (
                <button onClick={shareViaOS} style={{
                  flex: 1, padding: '8px', borderRadius: 8,
                  border: '1.5px solid var(--border-subtle)', background: 'transparent',
                  color: 'var(--text-secondary)', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                }}>他のアプリで共有</button>
              )}
            </div>
          </div>
        )}

        {sharePanel === 'import' && (
          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.6 }}>
              ファン仲間からもらった共有コード（TORCA1. で始まる文字列）を貼り付けてください。
            </div>
            <textarea
              value={importCode}
              onChange={e => setImportCode(e.target.value)}
              placeholder="TORCA1.xxxxxxxx..."
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8,
                border: '1.5px solid var(--border-subtle)', background: '#0c0c12',
                color: 'var(--text-primary)', fontSize: 10, outline: 'none', resize: 'vertical',
                fontFamily: 'monospace', wordBreak: 'break-all',
              }}
            />
            <button
              onClick={doImport}
              disabled={!importCode.trim()}
              style={{
                width: '100%', marginTop: 8, padding: '8px', borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                color: '#fff', fontWeight: 700, fontSize: 12,
                cursor: importCode.trim() ? 'pointer' : 'not-allowed',
                opacity: importCode.trim() ? 1 : 0.5,
              }}
            >取り込む</button>
          </div>
        )}

        {shareMsg && (
          <div style={{
            fontSize: 12, padding: '8px 12px', borderRadius: 8, marginBottom: 10, lineHeight: 1.5,
            background: shareMsg.includes('ません') && !shareMsg.includes('新しいクリップ')
              ? 'rgba(231,76,60,0.15)' : 'rgba(16,185,129,0.15)',
            color: shareMsg.includes('ません') && !shareMsg.includes('新しいクリップ')
              ? '#e74c3c' : '#34d399',
          }}>
            {shareMsg}
          </div>
        )}

        {/* プラットフォームフィルター */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {[{ id: 'all', label: 'すべて' }, ...Object.entries(PLATFORM_CONFIG).map(([id, c]) => ({ id, label: c.label }))].map(p => {
            const cfg = PLATFORM_CONFIG[p.id];
            return (
              <button key={p.id} onClick={() => setPlatformFilter(p.id)} style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 11,
                border: platformFilter === p.id ? `1.5px solid ${cfg?.color || 'var(--accent)'}` : '1.5px solid var(--border-subtle)',
                background: platformFilter === p.id ? `${cfg?.color || 'var(--accent)'}22` : 'var(--bg-card)',
                color: platformFilter === p.id ? (cfg?.color || 'var(--accent)') : 'var(--text-secondary)',
                fontWeight: platformFilter === p.id ? 700 : 400, cursor: 'pointer', transition: 'all 0.2s',
              }}>
                {cfg ? `${cfg.icon} ` : ''}{p.label}
              </button>
            );
          })}
        </div>

        {/* メンバーフィルター */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {MEMBERS_FILTER.map(m => (
            <button key={m.id} onClick={() => setMemberFilter(m.id)} style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 11,
              border: memberFilter === m.id ? `1.5px solid ${m.color || 'var(--accent)'}` : '1.5px solid var(--border-subtle)',
              background: memberFilter === m.id ? `${m.color || 'var(--accent)'}22` : 'var(--bg-card)',
              color: memberFilter === m.id ? (m.color || 'var(--accent)') : 'var(--text-secondary)',
              fontWeight: memberFilter === m.id ? 700 : 400, cursor: 'pointer', transition: 'all 0.2s',
            }}>
              {m.emoji} {m.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{filtered.length}件</span>
          <PlayAllButton queue={playQueue} label="▶ プレイリスト再生" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📼</div>
          <p style={{ fontSize: 14, margin: 0 }}>まだアーカイブがありません</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>検索タブでお気に入りを ♡ してみよう</p>
        </div>
      ) : (
        <div style={{ padding: '0 16px' }}>
          {filtered.map(item => {
            const cfg = PLATFORM_CONFIG[item.platform] || PLATFORM_CONFIG.youtube;
            const ml = memberLabel(item.member);
            return (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'stretch', position: 'relative',
                background: 'var(--bg-card)', borderRadius: 10,
                border: '1px solid var(--border-subtle)', marginBottom: 8, overflow: 'hidden',
              }}>
                <a href={item.url} target="_blank" rel="noopener noreferrer"
                  onClick={(e) => openItem(item, e)}
                  style={{ display: 'flex', textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 0 }}>
                  {item.thumbnailUrl ? (
                    <img src={item.thumbnailUrl} alt={item.title || item.note || ''} style={{ width: 120, height: 68, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{
                      width: 120, height: 68, flexShrink: 0, background: `${cfg.color}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, color: cfg.color,
                    }}>{cfg.icon}</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0, padding: '8px 36px 8px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                        background: `${cfg.color}22`, color: cfg.color,
                      }}>{cfg.icon} {cfg.label}</span>
                      {ml && (
                        <span style={{ fontSize: 9, color: ml.color, fontWeight: 700 }}>
                          {ml.emoji} {ml.label}
                        </span>
                      )}
                      {item.aiDetected && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                          background: 'rgba(255,105,180,0.15)', color: '#ff8ec7',
                        }}>🤖 AI</span>
                      )}
                      {item.shared && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                          background: 'rgba(16,185,129,0.15)', color: '#34d399',
                        }}>📥 共有</span>
                      )}
                    </div>
                    <p style={{
                      fontSize: 12, fontWeight: 600, margin: '0 0 3px', lineHeight: 1.4,
                      color: 'var(--text-primary)',
                      display: '-webkit-box', WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      wordBreak: 'break-word',
                    }}>
                      {item.note || item.title || (item.authorName ? `${item.authorName} のポスト` : item.url)}
                    </p>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                      {[item.song && `🎵 ${item.song}`, item.venue && `📍 ${item.venue}`, item.authorName]
                        .filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </a>
                <button
                  onClick={() => removeItem(item)}
                  style={{
                    position: 'absolute', top: 6, right: 6,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontSize: 14, padding: '2px 4px', color: 'var(--text-secondary)',
                    transition: 'color 0.2s',
                  }}
                  title="削除"
                >✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
