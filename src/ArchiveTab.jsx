// src/ArchiveTab.jsx
// みんなの撮可：ブックマーク + 手動/AIアーカイブの一覧と、共有コードによるファン間共有

import { useState, useEffect } from 'react';
import { MEMBERS_FILTER, PLATFORM_CONFIG, detectMemberName } from './data.js';
import { chipVars } from './theme.js';
import {
  KEYS, useBookmarks, useArchive, getList, updateList,
  buildShareCode, parseShareCode, mergeShareData,
} from './storage.js';
import { usePlayer } from './playerContext.js';
import { PlayAllButton, PageHead, EmptyState, PlatformTag, Notice } from './components.jsx';
import { Icon } from './icons.jsx';
import { useFlash } from './useFlash.js';
import EmbedModal from './EmbedModal.jsx';

const EMBED_PLATFORMS = ['x', 'tiktok', 'instagram'];

export default function ArchiveTab({ onGoSearch }) {
  const [memberFilter, setMemberFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [sharePanel, setSharePanel] = useState(null); // null | 'export' | 'import'
  const [embedItem, setEmbedItem] = useState(null);
  const [shareCode, setShareCode] = useState('');
  const [importCode, setImportCode] = useState('');
  const [shareMsg, flashShare] = useFlash();
  const [undo, setUndo] = useState(null); // 直前に削除したアイテム（元に戻す用）

  const { bookmarks, remove: removeBookmark } = useBookmarks();
  const { archive, remove: removeArchive } = useArchive();
  const player = usePlayer();

  // タイトル未取得の既存エントリを oEmbed で遡って補完する（1回の表示で最大5件）
  // 補完結果は ID 指定でストアに反映するため、取得中の追加・削除を上書きしない
  useEffect(() => {
    const targets = getList(KEYS.archive)
      .filter(a => (a.platform === 'x' || a.platform === 'tiktok') && !a.title && !a.enrichTried)
      .slice(0, 5);
    if (targets.length === 0) return;
    const ids = new Set(targets.map(t => t.id));
    updateList(KEYS.archive, prev => prev.map(a => (ids.has(a.id) ? { ...a, enrichTried: true } : a)));

    targets.forEach(async (t) => {
      try {
        const r = await fetch(`/api/oembed?url=${encodeURIComponent(t.url)}&platform=${t.platform}`);
        const oe = r.ok ? await r.json() : null;
        if (!oe) return;
        updateList(KEYS.archive, prev => {
          const urlTaken = oe.resolvedUrl && prev.some(a => a.url === oe.resolvedUrl);
          return prev.map(a => (a.id !== t.id ? a : {
            ...a,
            title: oe.title || a.title,
            authorName: oe.authorName || a.authorName,
            thumbnailUrl: a.thumbnailUrl || oe.thumbnailUrl || null,
            ...(t.platform === 'tiktok' && oe.videoId ? { tiktokVideoId: oe.videoId } : {}),
            ...(oe.resolvedUrl && !urlTaken ? { url: oe.resolvedUrl } : {}),
          }));
        });
      } catch { /* 補完失敗は無視（enrichTried で再試行を防ぐ） */ }
    });
  }, []);

  // URL アーカイブ済みの YouTube 動画はブックマーク側を重複表示しない
  const archivedVideoIds = new Set(archive.map(a => a.videoId).filter(Boolean));
  const bookmarkItems = bookmarks.filter(b => !archivedVideoIds.has(b.videoId)).map(b => ({
    id: 'yt_' + b.videoId,
    source: 'bookmark',
    platform: 'youtube',
    url: `https://www.youtube.com/watch?v=${b.videoId}`,
    title: b.title,
    authorName: b.channelTitle,
    thumbnailUrl: b.thumbnailUrl || b.thumbnail || null,
    member: detectMemberName(b.title),
    note: null,
    savedAt: b.savedAt || '',
    videoId: b.videoId,
    shared: !!b.shared,
  }));
  const archiveItems = archive.map(a => ({
    ...a,
    source: 'archive',
    member: a.member || detectMemberName(`${a.title || ''} ${a.note || ''}`),
  }));

  const allItems = [...bookmarkItems, ...archiveItems].sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
  const filtered = allItems.filter(item =>
    (memberFilter === 'all' || item.member === memberFilter) &&
    (platformFilter === 'all' || item.platform === platformFilter)
  );

  // YouTube のアイテムをアプリ内プレイヤーのプレイリストに変換
  const playQueue = filtered
    .filter(item => item.videoId)
    .map(item => ({
      videoId: item.videoId,
      title: item.title || item.note || item.url,
      channelTitle: item.authorName || '',
      thumbnailUrl: item.thumbnailUrl || '',
      publishedAt: '',
    }));

  // タップ時の挙動：YouTube → 撮可シアター / X・TikTok・Instagram → アプリ内埋め込み
  const openItem = (item, e) => {
    if (item.videoId && player) {
      e.preventDefault();
      const idx = playQueue.findIndex(q => q.videoId === item.videoId);
      player.openPlayer(playQueue, Math.max(0, idx));
      return;
    }
    if (EMBED_PLATFORMS.includes(item.platform)) {
      e.preventDefault();
      setEmbedItem(item);
    }
  };

  const removeItem = (item) => {
    if (item.source === 'bookmark') {
      const original = bookmarks.find(b => b.videoId === item.videoId);
      removeBookmark(item.videoId);
      setUndo({ title: item.title, restore: () => updateList(KEYS.bookmarks, prev => (prev.some(b => b.videoId === original.videoId) ? prev : [...prev, original])) });
    } else {
      const original = archive.find(a => a.id === item.id);
      removeArchive(item.id);
      setUndo({ title: item.note || item.title, restore: () => updateList(KEYS.archive, prev => (prev.some(a => a.url === original.url) ? prev : [original, ...prev])) });
    }
  };

  const openExport = () => {
    if (sharePanel === 'export') { setSharePanel(null); return; }
    if (allItems.length === 0) {
      flashShare('共有できるアーカイブがまだありません', 'warn', 3000);
      return;
    }
    setShareCode(buildShareCode({ bookmarks, archive }));
    setSharePanel('export');
    flashShare(null);
  };

  const copyShareCode = async () => {
    try {
      await navigator.clipboard.writeText(shareCode);
      flashShare('共有コードをコピーしました！Xやディスコでファン仲間に送ろう 💗', 'ok');
    } catch {
      flashShare('コピーできませんでした。コードを選択して手動でコピーしてください', 'warn');
    }
  };

  const shareViaOS = async () => {
    try {
      await navigator.share({
        title: 'TORCA 撮可アーカイブ',
        text: `きゅるして撮可アーカイブの共有コードだよ！TORCAの「みんなの撮可」で取り込んでね💗\n\n${shareCode}`,
      });
    } catch { /* ユーザーキャンセルは無視 */ }
  };

  const doImport = () => {
    try {
      const added = mergeShareData(parseShareCode(importCode));
      setImportCode('');
      flashShare(added > 0 ? `🎉 ${added}件のクリップを取り込みました！` : 'すべて登録済みでした（新しいクリップはありません）', added > 0 ? 'ok' : 'info', 5000);
    } catch (err) {
      flashShare(err.message, 'err', 5000);
    }
  };

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div>
      {embedItem && <EmbedModal item={embedItem} onClose={() => setEmbedItem(null)} />}

      <PageHead title="みんなの撮可" desc="保存したクリップの一覧です。共有コードでファン同士のアーカイブを交換できます（データは端末内にのみ保存）。" />

      {/* 共有コード */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button onClick={openExport} className={`btn btn-sm ${sharePanel === 'export' ? 'btn-soft' : 'btn-ghost'}`} style={{ flex: 1, padding: '10px 8px' }}>
          <Icon name="share" size={15} />共有コードを作成
        </button>
        <button onClick={() => { setSharePanel(sharePanel === 'import' ? null : 'import'); flashShare(null); }}
          className={`btn btn-sm ${sharePanel === 'import' ? 'btn-soft' : 'btn-ghost'}`} style={{ flex: 1, padding: '10px 8px' }}>
          <Icon name="download" size={15} />コードを取り込む
        </button>
      </div>

      {sharePanel === 'export' && (
        <div className="card card-pad" style={{ marginBottom: 10, animation: 'pageIn 0.2s var(--ease)' }}>
          <div style={{ fontSize: 11.5, color: 'var(--text-sub)', marginBottom: 8, lineHeight: 1.6 }}>
            このコードをファン仲間に送ると、あなたのアーカイブ（最新100件まで）を相手のTORCAに取り込めます。
          </div>
          <textarea readOnly value={shareCode} onFocus={e => e.target.select()} rows={3} className="textarea" style={{ color: 'var(--text-sub)' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={copyShareCode} className="btn btn-primary btn-sm" style={{ flex: 1, padding: 10 }}>コピー</button>
            {canNativeShare && (
              <button onClick={shareViaOS} className="btn btn-ghost btn-sm" style={{ flex: 1, padding: 10 }}>他のアプリで共有</button>
            )}
          </div>
        </div>
      )}

      {sharePanel === 'import' && (
        <div className="card card-pad" style={{ marginBottom: 10, animation: 'pageIn 0.2s var(--ease)' }}>
          <div style={{ fontSize: 11.5, color: 'var(--text-sub)', marginBottom: 8, lineHeight: 1.6 }}>
            ファン仲間からもらった共有コード（TORCA1. で始まる文字列）を貼り付けてください。
          </div>
          <textarea value={importCode} onChange={e => setImportCode(e.target.value)} placeholder="TORCA1.xxxxxxxx..." rows={3} className="textarea" />
          <button onClick={doImport} disabled={!importCode.trim()} className="btn btn-primary btn-sm btn-block" style={{ marginTop: 10, padding: 10 }}>
            取り込む
          </button>
        </div>
      )}

      <Notice msg={shareMsg} style={{ marginBottom: 10 }} />

      {/* フィルター */}
      <div className="chip-scroll" style={{ marginBottom: 8 }}>
        {[{ id: 'all', label: 'すべて' }, ...Object.entries(PLATFORM_CONFIG).map(([id, c]) => ({ id, label: c.label, cfg: c }))].map(p => (
          <button key={p.id} onClick={() => setPlatformFilter(p.id)}
            className={`chip chip-sm${platformFilter === p.id ? ' is-active' : ''}`}
            style={p.cfg ? { '--chip': p.cfg.color, '--chip-soft': p.cfg.soft, '--chip-deep': p.cfg.color } : undefined}>
            {p.cfg && <span>{p.cfg.icon}</span>}{p.label}
          </button>
        ))}
      </div>
      <div className="chip-scroll" style={{ marginBottom: 14 }}>
        {MEMBERS_FILTER.map(m => (
          <button key={m.id} onClick={() => setMemberFilter(m.id)}
            className={`chip chip-sm${memberFilter === m.id ? ' is-active' : ''}`} style={chipVars(m.memberId)}>
            <span>{m.emoji}</span>{m.label}
          </button>
        ))}
      </div>

      {undo && (
        <div className="notice notice-info" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            「{undo.title || 'クリップ'}」を削除しました
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => { undo.restore(); setUndo(null); }}>元に戻す</button>
          <button onClick={() => setUndo(null)} aria-label="閉じる" style={{ display: 'flex', color: 'var(--brand)' }}><Icon name="close" size={15} /></button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: 'var(--text-sub)', fontWeight: 700 }}>{filtered.length}件</span>
        <PlayAllButton queue={playQueue} label="プレイリスト再生" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="📼" title={allItems.length === 0 ? 'まだアーカイブがありません' : '条件に合うクリップがありません'}
          actions={allItems.length === 0 && <button className="btn btn-primary" onClick={onGoSearch}><Icon name="search" size={15} />撮可をさがす</button>}>
          {allItems.length === 0 ? <>さがすタブでお気に入りを ♡ してみよう</> : <>フィルターを変えてみてください</>}
        </EmptyState>
      ) : (
        filtered.map(item => {
          const cfg = PLATFORM_CONFIG[item.platform] || PLATFORM_CONFIG.youtube;
          const ml = item.member ? MEMBERS_FILTER.find(m => m.id === item.member) : null;
          const meta = [item.song && `🎵 ${item.song}`, item.venue && `📍 ${item.venue}`, item.authorName].filter(Boolean).join(' · ');
          return (
            <div key={item.id} className="row-card">
              <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={(e) => openItem(item, e)} className="row-link">
                <div className="row-thumb" style={item.thumbnailUrl ? undefined : { background: cfg.soft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: cfg.color }}>
                  {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" loading="lazy" referrerPolicy="no-referrer" /> : cfg.icon}
                  {item.videoId && player && <span className="play-dot"><Icon name="play" size={13} /></span>}
                </div>
                <div className="row-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5, flexWrap: 'wrap' }}>
                    <PlatformTag cfg={cfg} />
                    {ml && <span className="tag" style={{ ...tagFor(ml.memberId) }}>{ml.emoji} {ml.label}</span>}
                    {item.aiDetected && <span className="tag" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>🤖 AI</span>}
                    {item.shared && <span className="tag" style={{ background: 'var(--ok-soft)', color: 'var(--ok)' }}>共有</span>}
                  </div>
                  <p className="row-title">
                    {item.note || item.title || (item.authorName ? `${item.authorName} のポスト` : item.url)}
                  </p>
                  {meta && <div className="row-meta" style={{ marginTop: 3 }}>{meta}</div>}
                </div>
              </a>
              <button onClick={() => removeItem(item)} className="row-action" title="削除" aria-label="削除">
                <Icon name="trash" size={17} />
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}

function tagFor(memberId) {
  const v = chipVars(memberId);
  return v ? { background: v['--chip-soft'], color: v['--chip-deep'] } : {};
}
