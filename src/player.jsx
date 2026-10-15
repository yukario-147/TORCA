// src/player.jsx
// 撮可シアター：アプリ内 YouTube プレイヤー + プレイリスト連続再生
// YouTube IFrame Player API を使用（動画のホスティングは行わず公式埋め込みのみ）

import { useState, useEffect, useRef, useCallback } from 'react';
import { formatDate } from './theme.js';
import { useBookmarks } from './storage.js';
import { PlayerCtx } from './playerContext.js';
import { useHistoryModal } from './useHistoryModal.js';
import { Icon } from './icons.jsx';

let ytApiPromise = null;
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      const timer = setTimeout(() => reject(new Error('YouTube API timeout')), 15000);
      window.onYouTubeIframeAPIReady = () => { clearTimeout(timer); prev?.(); resolve(window.YT); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.onerror = () => { clearTimeout(timer); reject(new Error('YouTube API load failed')); };
      document.head.appendChild(s);
    }).catch((err) => {
      // 次回オープン時に再試行できるようにする
      ytApiPromise = null;
      document.querySelector('script[src="https://www.youtube.com/iframe_api"]')?.remove();
      throw err;
    });
  }
  return ytApiPromise;
}

export function PlayerProvider({ children }) {
  const [session, setSession] = useState(null); // { queue, index }

  const openPlayer = useCallback((queue, index = 0) => {
    const q = (queue || []).filter(v => v && v.videoId);
    if (q.length === 0) return;
    setSession({ queue: q, index: Math.min(Math.max(0, index), q.length - 1) });
  }, []);

  const close = useCallback(() => setSession(null), []);
  const setIndex = useCallback((i) => setSession(s => (s ? { ...s, index: i } : s)), []);

  return (
    <PlayerCtx.Provider value={{ openPlayer }}>
      {children}
      {session && (
        <PlayerModal queue={session.queue} index={session.index} setIndex={setIndex} onClose={close} />
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
  const [apiError, setApiError] = useState(false);
  const { toggle: toggleBookmark, has: isBookmarked } = useBookmarks();
  const requestClose = useHistoryModal(onClose);

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
    }).catch(() => {
      if (!cancelled) setApiError(true);
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
    if (p && typeof p.loadVideoById === 'function') p.loadVideoById(video.videoId);
  }, [video.videoId]);

  // キーボード操作
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') requestClose();
      if (e.key === 'ArrowRight') goto(indexRef.current + 1);
      if (e.key === 'ArrowLeft') goto(indexRef.current - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose, goto]);

  const ytUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
  const shareUrl = `https://x.com/intent/post?text=${encodeURIComponent(
    `「${video.title}」\n#きゅるして #撮可\nhttps://youtu.be/${video.videoId}`
  )}`;
  const saved = isBookmarked(video.videoId);
  const showFallback = embedError || apiError;

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label="撮可シアター">
      <div className="sheet-head">
        <span className="logo" style={{ fontSize: 16 }}>TORCA</span>
        <span style={{ fontSize: 12.5, fontWeight: 800 }}>撮可シアター</span>
        <span className="tag" style={{ background: 'var(--accent-soft)', color: 'var(--accent-deep)' }}>{index + 1} / {queue.length}</span>
        <div style={{ flex: 1 }} />
        <button onClick={requestClose} className="icon-btn" aria-label="閉じる"><Icon name="close" size={17} /></button>
      </div>

      <div className="sheet-body">
        <div style={{ width: '100%', maxWidth: 860, margin: '0 auto' }}>
          <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: '#000', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
            {/* YT.Player がこの div を iframe に置き換える */}
            <div ref={containerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
            {showFallback && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.97)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 12, padding: 20, textAlign: 'center',
              }}>
                <div style={{ fontSize: 30 }}>🙈</div>
                <div style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.6 }}>
                  {apiError
                    ? <>プレイヤーを読み込めませんでした。<br />通信状況を確認するか、YouTubeで直接ご覧ください。</>
                    : <>この動画はアプリ内で再生できません（埋め込み不可・削除済みなど）。<br />YouTubeで直接ご覧ください。</>}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <a href={ytUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ background: '#FF0033', color: '#fff' }}>
                    ▶ YouTubeで見る <Icon name="external" size={13} />
                  </a>
                  {hasNext && <button onClick={() => goto(index + 1)} className="btn btn-primary btn-sm">次のクリップへ →</button>}
                </div>
              </div>
            )}
          </div>

          {/* タイトル・メタ */}
          <div style={{ padding: '16px 2px 12px' }}>
            <div style={{ fontSize: 15.5, fontWeight: 800, lineHeight: 1.5, marginBottom: 6 }}>{video.title}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span>{[video.channelTitle, video.publishedAt && formatDate(video.publishedAt)].filter(Boolean).join(' · ')}</span>
              {typeof video.takaScore === 'number' && (
                <span className="tag" style={video.takaScore >= 80 ? { background: 'var(--ok-soft)', color: 'var(--ok)' } : { background: 'var(--surface-2)', color: 'var(--text-sub)' }}>
                  📸 撮可スコア {video.takaScore}
                </span>
              )}
            </div>
          </div>

          {/* コントロール */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 14 }}>
            <button onClick={() => goto(index - 1)} disabled={!hasPrev} className="btn btn-ghost btn-sm"><Icon name="prev" size={14} />前へ</button>
            <button onClick={() => goto(index + 1)} disabled={!hasNext} className="btn btn-ghost btn-sm">次へ<Icon name="next" size={14} /></button>
            <div style={{ flex: 1 }} />
            <button onClick={() => toggleBookmark(video)} className={`btn btn-sm ${saved ? 'btn-soft' : 'btn-ghost'}`} aria-pressed={saved}>
              <Icon name="heart" size={14} filled={saved} />{saved ? '保存済み' : '保存'}
            </button>
            <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">𝕏 ポスト</a>
            <a href={ytUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">YouTube <Icon name="external" size={13} /></a>
          </div>

          {/* 次に再生 */}
          {hasNext && (
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>UP NEXT</div>
              {queue.slice(index + 1, index + 4).map((v, i) => (
                <button key={v.videoId} onClick={() => goto(index + 1 + i)} className="card"
                  style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 8, width: '100%', textAlign: 'left', marginBottom: 6 }}>
                  <div style={{ width: 80, aspectRatio: '16 / 9', borderRadius: 9, overflow: 'hidden', background: 'var(--surface-2)', flexShrink: 0 }}>
                    {v.thumbnailUrl && <img src={v.thumbnailUrl} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.45, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {v.title}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
