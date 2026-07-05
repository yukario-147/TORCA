// src/EmbedModal.jsx
// X / TikTok ポストのアプリ内埋め込みビューア
// 各プラットフォームの「公式埋め込み iframe」を直接使う方式。
// widgets.js 等の外部スクリプトに依存しないため、広告ブロッカーや読み込み順の影響を受けにくい。

import { useState, useEffect, useRef } from 'react';
import { D } from './theme.js';

// X の URL からステータス ID を抽出
function xStatusId(url) {
  const m = (url || '').match(/status(?:es)?\/(\d+)/);
  return m ? m[1] : null;
}

// TikTok URL から動画 ID を抽出
function tiktokVideoId(url) {
  const m = (url || '').match(/\/video\/(\d+)/);
  return m ? m[1] : null;
}

// Instagram URL からショートコードを抽出
function igShortcode(url) {
  const m = (url || '').match(/\/(?:p|reel|reels|tv)\/([\w-]+)/);
  return m ? m[1] : null;
}

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

// X：公式埋め込み iframe（platform.twitter.com/embed/Tweet.html）
function XEmbed({ url, onFail }) {
  const id = xStatusId(url);
  const [oembedHtml, setOembedHtml] = useState(null);
  const blockquoteRef = useRef(null);

  // ID が取れない短縮 URL 等は oEmbed の blockquote にフォールバック
  useEffect(() => {
    if (id) return;
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/oembed?url=${encodeURIComponent(url)}&platform=x`);
        const data = r.ok ? await r.json() : null;
        if (!alive) return;
        if (data?.html) setOembedHtml(data.html);
        else onFail();
      } catch {
        if (alive) onFail();
      }
    })();
    return () => { alive = false; };
  }, [id, url, onFail]);

  useEffect(() => {
    if (!oembedHtml || !blockquoteRef.current) return;
    blockquoteRef.current.innerHTML = oembedHtml.replace(
      '<blockquote class="twitter-tweet"',
      '<blockquote class="twitter-tweet" data-theme="dark"'
    );
    loadScript('https://platform.twitter.com/widgets.js').then(() => {
      window.twttr?.widgets?.load(blockquoteRef.current);
    });
  }, [oembedHtml]);

  if (id) {
    return (
      <iframe
        src={`https://platform.twitter.com/embed/Tweet.html?id=${id}&theme=dark&dnt=true&lang=ja`}
        style={{
          width: '100%', maxWidth: 550, height: 'min(72vh, 620px)',
          border: 'none', borderRadius: 14, display: 'block', margin: '0 auto',
          background: '#0c0c12',
        }}
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        title="X post"
      />
    );
  }
  return <div ref={blockquoteRef} style={{ display: 'flex', justifyContent: 'center' }} />;
}

// TikTok：公式埋め込み iframe（tiktok.com/embed/v2）
// 短縮 URL（vt.tiktok.com 等）で動画 ID が取れない場合は oEmbed API 経由で解決する
function TikTokEmbed({ item, onFail }) {
  const [id, setId] = useState(() => item.tiktokVideoId || tiktokVideoId(item.url));
  const [resolving, setResolving] = useState(() => !(item.tiktokVideoId || tiktokVideoId(item.url)));

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
      } finally {
        if (alive) setResolving(false);
      }
    })();
    return () => { alive = false; };
  }, [id, item.url, onFail]);

  if (!id) {
    return resolving
      ? <div style={{ textAlign: 'center', padding: 40, color: D.textSub, fontSize: 12 }}>動画情報を取得中…</div>
      : null;
  }
  return (
    <iframe
      src={`https://www.tiktok.com/embed/v2/${id}`}
      style={{
        width: '100%', maxWidth: 340, height: 'min(76vh, 600px)',
        border: 'none', borderRadius: 14, display: 'block', margin: '0 auto',
        background: '#000',
      }}
      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
      allowFullScreen
      title="TikTok"
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
      style={{
        width: '100%', maxWidth: 400, height: 'min(76vh, 640px)',
        border: 'none', borderRadius: 14, display: 'block', margin: '0 auto',
        background: '#fff',
      }}
      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
      allowFullScreen
      title="Instagram"
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

  const platformLabel = item.platform === 'x' ? '𝕏 ポスト' : item.platform === 'instagram' ? 'Instagram' : 'TikTok';

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9500,
        background: 'rgba(6,6,12,0.97)', display: 'flex', flexDirection: 'column',
        animation: 'pageIn 0.2s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        padding: 'calc(env(safe-area-inset-top, 0px) + 12px) 16px 12px',
      }}>
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

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 14px calc(env(safe-area-inset-bottom, 0px) + 30px)', minHeight: 0 }}>
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
            <TikTokEmbed item={item} onFail={() => setFailed(true)} />
          ) : item.platform === 'instagram' ? (
            <InstagramEmbed item={item} onFail={() => setFailed(true)} />
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
