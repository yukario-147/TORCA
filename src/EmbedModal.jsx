// src/EmbedModal.jsx
// X / TikTok / Instagram ポストのアプリ内埋め込みビューア
// 各プラットフォームの「公式埋め込み iframe」を直接使う方式。
// 外部スクリプト（widgets.js 等）に依存しないため、広告ブロッカーや読み込み順の影響を受けにくい。

import { useState, useEffect, useCallback } from 'react';
import { PLATFORM_CONFIG } from './data.js';
import { xStatusId, extractTikTokId, igShortcode } from './urls.js';
import { useHistoryModal } from './useHistoryModal.js';
import { PlatformTag } from './components.jsx';
import { Icon } from './icons.jsx';

const frameStyle = (maxWidth, height) => ({
  width: '100%', maxWidth, height, border: 'none', borderRadius: 18, display: 'block', margin: '0 auto',
  background: '#fff', boxShadow: 'var(--shadow-md)',
});

// X：公式埋め込み iframe（platform.twitter.com/embed/Tweet.html）
function XEmbed({ url, onFail }) {
  const id = xStatusId(url);
  useEffect(() => { if (!id) onFail(); }, [id, onFail]);
  if (!id) return null;
  return (
    <iframe
      src={`https://platform.twitter.com/embed/Tweet.html?id=${id}&theme=light&dnt=true&lang=ja`}
      style={frameStyle(550, 'min(72vh, 640px)')}
      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
      allowFullScreen
      title="X のポスト"
    />
  );
}

// TikTok：公式埋め込み iframe（tiktok.com/embed/v2）
// 短縮 URL（vt.tiktok.com 等）で動画 ID が取れない場合は oEmbed API 経由で解決する
function TikTokEmbed({ item, onFail }) {
  const initialId = item.tiktokVideoId || extractTikTokId(item.url);
  const [id, setId] = useState(initialId);

  useEffect(() => {
    if (id) return;
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/oembed?url=${encodeURIComponent(item.url)}&platform=tiktok`);
        const data = r.ok ? await r.json() : null;
        if (!alive) return;
        if (data?.videoId) setId(data.videoId);
        else onFail();
      } catch {
        if (alive) onFail();
      }
    })();
    return () => { alive = false; };
  }, [id, item.url, onFail]);

  if (!id) {
    return <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /><div style={{ fontSize: 12, color: 'var(--text-sub)' }}>動画情報を取得中…</div></div>;
  }
  return (
    <iframe
      src={`https://www.tiktok.com/embed/v2/${id}`}
      style={frameStyle(340, 'min(76vh, 600px)')}
      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
      allowFullScreen
      title="TikTok の動画"
    />
  );
}

// Instagram：公式埋め込み iframe（instagram.com/p/{code}/embed/）
function InstagramEmbed({ item, onFail }) {
  const code = igShortcode(item.url);
  useEffect(() => { if (!code) onFail(); }, [code, onFail]);
  if (!code) return null;
  return (
    <iframe
      src={`https://www.instagram.com/p/${code}/embed/captioned/`}
      style={frameStyle(400, 'min(76vh, 640px)')}
      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
      allowFullScreen
      title="Instagram の投稿"
    />
  );
}

export default function EmbedModal({ item, onClose }) {
  const [failed, setFailed] = useState(false);
  const onFail = useCallback(() => setFailed(true), []); // 安定参照（再描画のたびに再取得しない）
  const requestClose = useHistoryModal(onClose);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') requestClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose]);

  const cfg = PLATFORM_CONFIG[item.platform] || PLATFORM_CONFIG.x;

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={`${cfg.label} の投稿`}
      onClick={(e) => { if (e.target === e.currentTarget) requestClose(); }}>
      <div className="sheet-head">
        <PlatformTag cfg={cfg} />
        {item.authorName && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{item.authorName}</span>}
        <div style={{ flex: 1 }} />
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }}>
          アプリで開く <Icon name="external" size={13} />
        </a>
        <button onClick={requestClose} className="icon-btn" aria-label="閉じる"><Icon name="close" size={17} /></button>
      </div>

      <div className="sheet-body" onClick={(e) => { if (e.target === e.currentTarget) requestClose(); }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          {failed ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🙈</div>
              <div style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.7, marginBottom: 16 }}>
                この投稿は埋め込み表示できませんでした。<br />削除済みか、埋め込みが許可されていない可能性があります。
              </div>
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                元の投稿を開く <Icon name="external" size={14} />
              </a>
            </div>
          ) : item.platform === 'x' ? (
            <XEmbed url={item.url} onFail={onFail} />
          ) : item.platform === 'tiktok' ? (
            <TikTokEmbed item={item} onFail={onFail} />
          ) : item.platform === 'instagram' ? (
            <InstagramEmbed item={item} onFail={onFail} />
          ) : null}

          {(item.note || item.song || item.venue) && !failed && (
            <div className="card" style={{ marginTop: 14, padding: '12px 16px', fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.8 }}>
              {item.note && <div>📌 {item.note}</div>}
              {(item.song || item.venue) && (
                <div>{[item.song && `🎵 ${item.song}`, item.venue && `📍 ${item.venue}`].filter(Boolean).join(' · ')}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
