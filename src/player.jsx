// src/player.jsx
// 撮可シアター：アプリ内 YouTube プレイヤー + プレイリスト連続再生
// YouTube IFrame Player API を使用（動画のホスティングは行わず公式埋め込みのみ）

import { useState, useEffect, useRef, useCallback } from 'react';
import { D, formatDate } from './theme.js';
import { useBookmarks } from './storage.js';
import { PlayerCtx } from './playerContext.js';

let ytApiPromise = null;
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      document.head.appendChild(s);
    });
  }
  return ytApiPromise;
}

export function PlayerProvider({ children }) {
  const [session, setSession] = useState(null); // { queue, index }

  const openPlayer = useCallback((queue, index = 0) => {
    const q = (queue || []).filter(v => v && v.videoId);
    if (q.length === 0) return;
    setSession({ queue: q, index: Math.min(index, q.length - 1) });
  }, []);

  const close = useCallback(() => setSession(null), []);
  const setIndex = useCallback((i) => setSession(s => (s ? { ...s, index: i } : s)), []);

  return (
    <PlayerCtx.Provider value={{ openPlayer }}>
      {children}
      {session && (
        <PlayerModal
          queue={session.queue}
          index={session.index}
          setIndex={setIndex}
          onClose={close}
        />
      )}
    </PlayerCtx.Provider>
  );
}

function PlayerModal({ queue, index, setIndex, onClose }) {
  const video = queue[index];
  const hasPrev = index > 0;
  const hasNext = index < queue.length - 1;
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const indexRef = useRef(index);
  const queueRef = useRef(queue);
  const [embedError, setEmbedError] = useState(false);
  const { toggle: toggleBookmark, has: isBookmarked } = useBookmarks();

  // イベントコールバック（onStateChange 等）から最新の index / queue を参照するための ref
  useEffect(() => {
    indexRef.current = index;
    queueRef.current = queue;
  }, [index, queue]);

  const goto = useCallback((i) => {
    if (i >= 0 && i < queueRef.current.length) {
      setEmbedError(false);
      setIndex(i);
    }
  }, [setIndex]);

  // プレイヤー生成（初回のみ）
  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !containerRef.current) return;
      playerRef.current = new YT.Player(containerRef.current, {
        videoId: queueRef.current[indexRef.current].videoId,
        playerVars: { autoplay: 1, playsinline: 1, rel: 0 },
        events: {
          onStateChange: (e) => {
            // 再生終了 → 次のクリップへ自動送り
            if (e.data === YT.PlayerState.ENDED && indexRef.current < queueRef.current.length - 1) {
              setIndex(indexRef.current + 1);
            }
          },
          onError: () => setEmbedError(true),
        },
      });
    });
    return () => {
      cancelled = true;
      try { playerRef.current?.destroy(); } catch { /* 破棄失敗は無視 */ }
      playerRef.current = null;
    };
  }, [setIndex]);

  // index 変更で動画を差し替え
  useEffect(() => {
    const p = playerRef.current;
    if (p && typeof p.loadVideoById === 'function') {
      setEmbedError(false);
      p.loadVideoById(video.videoId);
    }
  }, [video.videoId]);

  // キーボード操作
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && indexRef.current < queueRef.current.length - 1) goto(indexRef.current + 1);
      if (e.key === 'ArrowLeft' && indexRef.current > 0) goto(indexRef.current - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, goto]);

  const shareUrl = `https://x.com/intent/post?text=${encodeURIComponent(
    `「${video.title}」\n#きゅるして #撮可\nhttps://youtu.be/${video.videoId}`
  )}`;

  const ctrlBtn = (enabled) => ({
    background: 'rgba(255,255,255,0.06)', border: `1px solid ${D.border}`,
    borderRadius: 10, padding: '9px 16px', color: enabled ? D.text : D.textMuted,
    fontSize: 13, fontWeight: 700, cursor: enabled ? 'pointer' : 'not-allowed',
    opacity: enabled ? 1 : 0.45, transition: 'all 0.2s',
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9500,
      background: 'rgba(6,6,12,0.97)', display: 'flex', flexDirection: 'column',
      animation: 'pageIn 0.2s cubic-bezier(0.4,0,0.2,1)',
    }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: D.accentLight }}>📺 撮可シアター</span>
        <span style={{ fontSize: 11, color: D.textSub }}>{index + 1} / {queue.length}</span>
        <div style={{ flex: 1 }} />
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.08)', border: `1px solid ${D.border}`,
          borderRadius: 10, padding: '8px 16px', color: D.text, fontSize: 13,
          fontWeight: 700, cursor: 'pointer',
        }}>✕ 閉じる</button>
      </div>

      {/* プレイヤー本体 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 12px', minHeight: 0, overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 860 }}>
          <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: '#000', borderRadius: 14, overflow: 'hidden', border: `1px solid ${D.border}` }}>
            {/* YT.Player がこの div を iframe に置き換える */}
            <div ref={containerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
            {embedError && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(12,12,18,0.95)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 12, padding: 20, textAlign: 'center',
              }}>
                <div style={{ fontSize: 32 }}>🙈</div>
                <div style={{ fontSize: 13, color: D.textSub, lineHeight: 1.6 }}>
                  この動画は埋め込み再生が許可されていません。<br />YouTubeで直接ご覧ください。
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a href={`https://www.youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noopener noreferrer"
                    style={{ background: '#FF0000', borderRadius: 10, padding: '9px 16px', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                    ▶ YouTubeで見る ↗
                  </a>
                  {hasNext && (
                    <button onClick={() => goto(index + 1)} style={{ ...ctrlBtn(true), background: 'var(--accent)' , color: '#fff', border: 'none' }}>
                      次のクリップへ →
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* タイトル・メタ */}
          <div style={{ padding: '14px 4px 10px' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: D.text, lineHeight: 1.45, marginBottom: 6 }}>
              {video.title}
            </div>
            <div style={{ fontSize: 11, color: D.textSub }}>
              {video.channelTitle}
              {video.publishedAt ? ` · ${formatDate(video.publishedAt)}` : ''}
              {typeof video.takaScore === 'number' && (
                <span style={{ marginLeft: 8, color: video.takaScore >= 80 ? '#10b981' : D.textSub }}>
                  📸 撮可スコア {video.takaScore}
                </span>
              )}
            </div>
          </div>

          {/* コントロール */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 12 }}>
            <button onClick={() => goto(index - 1)} disabled={!hasPrev} style={ctrlBtn(hasPrev)}>⏮ 前へ</button>
            <button onClick={() => goto(index + 1)} disabled={!hasNext} style={ctrlBtn(hasNext)}>次へ ⏭</button>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => toggleBookmark(video)}
              style={{ ...ctrlBtn(true), color: isBookmarked(video.videoId) ? D.pink : D.textSub }}>
              {isBookmarked(video.videoId) ? '♥ 保存済み' : '♡ 保存'}
            </button>
            <a href={shareUrl} target="_blank" rel="noopener noreferrer"
              style={{ ...ctrlBtn(true), textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              𝕏 ポスト
            </a>
            <a href={`https://www.youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noopener noreferrer"
              style={{ ...ctrlBtn(true), textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              YouTube ↗
            </a>
          </div>

          {/* 次に再生 */}
          {hasNext && (
            <div style={{ paddingBottom: 24 }}>
              <div style={{ fontSize: 11, color: D.textMuted, fontWeight: 700, marginBottom: 8 }}>次に再生</div>
              {queue.slice(index + 1, index + 4).map((v, i) => (
                <div key={v.videoId} onClick={() => goto(index + 1 + i)}
                  style={{
                    display: 'flex', gap: 10, alignItems: 'center', padding: '6px 8px',
                    borderRadius: 10, cursor: 'pointer', marginBottom: 4,
                    background: 'rgba(255,255,255,0.03)', border: `1px solid ${D.border}`,
                  }}>
                  {v.thumbnailUrl
                    ? <img src={v.thumbnailUrl} alt="" style={{ width: 72, height: 40, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                    : <div style={{ width: 72, height: 40, borderRadius: 6, background: '#1a1828', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: D.textMuted }}>▶</div>}
                  <div style={{ fontSize: 11, color: D.textSub, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {v.title}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
