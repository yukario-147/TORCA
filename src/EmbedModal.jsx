// src/EmbedModal.jsx
// X / TikTok ポストのアプリ内埋め込みビューア
// 各プラットフォームの公式埋め込み（oEmbed / 公式 iframe）のみを使用し、動画はホスティングしない

import { useState, useEffect, useRef } from 'react';
import { D } from './theme.js';

function loadScript(src) {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = resolve;
    document.body.appendChild(s);
  });
}

// TikTok URL から動画 ID を抽出（公式 embed iframe 用）
function tiktokVideoId(url) {
  const m = (url || '').match(/\/video\/(\d+)/);
  return m ? m[1] : null;
}

function XEmbed({ url, onFail }) {
  const ref = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/oembed?url=${encodeURIComponent(url)}&platform=x`);
        const data = r.ok ? await r.json() : null;
        if (!alive) return;
        if (!data?.html) { onFail(); return; }
        if (ref.current) {
          ref.current.innerHTML = data.html.includes('data-theme')
            ? data.html
            : data.html.replace('<blockquote class="twitter-tweet"', '<blockquote class="twitter-tweet" data-theme="dark"');
        }
        await loadScript('https://platform.twitter.com/widgets.js');
        if (alive && window.twttr?.widgets && ref.current) {
          await window.twttr.widgets.load(ref.current);
        }
        if (alive) setLoading(false);
      } catch {
        if (alive) onFail();
      }
    })();
    return () => { alive = false; };
  }, [url, onFail]);

  return (
    <div>
      {loading && <div style={{ textAlign: 'center', padding: 30, color: D.textSub, fontSize: 12 }}>ポストを読み込み中…</div>}
      <div ref={ref} style={{ display: 'flex', justifyContent: 'center' }} />
    </div>
  );
}

function TikTokEmbed({ url, onFail }) {
  const id = tiktokVideoId(url);
  useEffect(() => { if (!id) onFail(); }, [id, onFail]);
  if (!id) return null;
  return (
    <iframe
      src={`https://www.tiktok.com/embed/v2/${id}`}
      style={{ width: '100%', maxWidth: 340, height: 580, border: 'none', borderRadius: 12, display: 'block', margin: '0 auto', background: '#000' }}
      allow="autoplay; encrypted-media; fullscreen"
      allowFullScreen
      title="TikTok"
    />
  );
}

export default function EmbedModal({ item, onClose }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const platformLabel = item.platform === 'x' ? '𝕏 ポスト' : 'TikTok';

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9500,
        background: 'rgba(6,6,12,0.95)', display: 'flex', flexDirection: 'column',
        animation: 'pageIn 0.2s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: D.accentLight }}>{platformLabel}</span>
        <div style={{ flex: 1 }} />
        <a href={item.url} target="_blank" rel="noopener noreferrer"
          style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${D.border}`, borderRadius: 10, padding: '8px 14px', color: D.text, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
          アプリで開く ↗
        </a>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.08)', border: `1px solid ${D.border}`,
          borderRadius: 10, padding: '8px 16px', color: D.text, fontSize: 13,
          fontWeight: 700, cursor: 'pointer',
        }}>✕ 閉じる</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 14px 30px', minHeight: 0 }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          {failed ? (
            <div style={{ textAlign: 'center', padding: '50px 20px' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🙈</div>
              <div style={{ fontSize: 13, color: D.textSub, lineHeight: 1.7, marginBottom: 16 }}>
                このポストは埋め込み表示できませんでした。<br />削除済みか、埋め込みが許可されていない可能性があります。
              </div>
              <a href={item.url} target="_blank" rel="noopener noreferrer"
                style={{ background: 'var(--accent)', borderRadius: 10, padding: '10px 18px', color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                元のポストを開く ↗
              </a>
            </div>
          ) : item.platform === 'x' ? (
            <XEmbed url={item.url} onFail={() => setFailed(true)} />
          ) : item.platform === 'tiktok' ? (
            <TikTokEmbed url={item.url} onFail={() => setFailed(true)} />
          ) : null}

          {(item.note || item.song || item.venue) && !failed && (
            <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card)', border: `1px solid ${D.border}`, fontSize: 11, color: D.textSub, lineHeight: 1.7 }}>
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
