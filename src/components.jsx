// src/components.jsx
// 共通 UI コンポーネント（Footer / ClipRow / PlayAllButton / Spinner）

import { useState } from "react";
import { D, fmt, formatDate } from "./theme.js";
import { usePlayer } from "./playerContext.js";
import { isNewSince } from "./storage.js";

// =====================
// フッター
// =====================
export function Footer({ onNav }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div style={{ background: D.surface, flexShrink: 0 }}>
      {/* グラデーションライン */}
      <div style={{ height: 2, background: "linear-gradient(90deg,#FFD700,#9B59B6,#FF69B4,#E74C3C)", opacity: 0.6 }} />
      <div style={{ padding: "12px 20px" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", marginBottom: 6 }}>
          {[["利用規約","terms"],["プライバシーポリシー","privacy"],["運営者情報","about"],["削除申請","takedown"]].map(([label, t]) => (
            <button key={t} onClick={() => onNav(t)}
              onMouseEnter={() => setHovered(t)}
              onMouseLeave={() => setHovered(null)}
              style={{ background: "none", border: "none", color: hovered === t ? "#fff" : D.textSub, fontSize: 11, cursor: "pointer", textDecoration: "underline", padding: 0, transition: "color 0.2s ease" }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ textAlign: "center", marginBottom: 4 }}>
          <a href="https://www.kyurushite.com/" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 10, color: D.accentLight, textDecoration: "none" }}>
            きゅるりんってしてみて 公式サイト ↗
          </a>
        </div>
        <div style={{ textAlign: "center", fontSize: 10, color: D.textMuted, lineHeight: 1.8 }}>
          TORCAは非公式のファンサービスです。著作権はきゅるりんってしてみて・ディアステージに帰属します。<br />© 2025 TORCA
        </div>
      </div>
    </div>
  );
}

// YouTube 実データの撮可バッジ判定
function takaBadge(video) {
  if (video.isOfficial) {
    return { text: '🏷 公式', bg: 'rgba(168,85,247,0.18)', color: '#a855f7' };
  }
  const score = video.takaScore;
  if (score === null || score === undefined) return null;
  if (score >= 80) return { text: '📸 撮可', bg: 'rgba(16,185,129,0.18)', color: '#10b981' };
  if (score >= 50) return { text: '🎬 関連', bg: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' };
  return { text: '🏷 公式', bg: 'rgba(168,85,247,0.15)', color: '#a855f7' };
}

// =====================
// クリップ行（YouTube 実データ用の横長カード）
// queue/queueIndex を渡すとタップでアプリ内プレイヤー（撮可シアター）が開き、
// その一覧をプレイリストとして連続再生できる
// =====================
export function ClipRow({ video, bookmarked, onToggleBookmark, rank, queue, queueIndex }) {
  const badge = takaBadge(video);
  const player = usePlayer();
  const canPlay = !!player && !!video.videoId;
  const isNew = isNewSince(video.publishedAt);

  const handleOpen = (e) => {
    if (!canPlay) return; // プレイヤー外では通常の外部リンク遷移
    e.preventDefault();
    const q = queue && queue.length > 0 ? queue : [video];
    player.openPlayer(q, queueIndex ?? q.indexOf(video));
  };

  return (
    <div
      style={{
        display: 'flex', alignItems: 'stretch', position: 'relative',
        background: 'var(--bg-card)', borderRadius: 10,
        border: '1px solid var(--border-subtle)', marginBottom: 8, overflow: 'hidden',
      }}
    >
      {rank != null && (
        <div style={{
          width: 26, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 900, color: rank <= 3 ? D.gold : D.textMuted,
        }}>{rank}</div>
      )}
      <a
        href={`https://www.youtube.com/watch?v=${video.videoId}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleOpen}
        style={{ display: 'flex', textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 0 }}
      >
        <div style={{ position: 'relative', width: 120, height: 68, flexShrink: 0 }}>
          {video.thumbnailUrl ? (
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%', background: '#1a1828',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)', fontSize: 20,
            }}>▶</div>
          )}
          {canPlay && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, color: '#fff', paddingLeft: 2,
              }}>▶</span>
            </div>
          )}
          {isNew && (
            <span style={{
              position: 'absolute', top: 4, left: 4, fontSize: 8, fontWeight: 900,
              padding: '1px 5px', borderRadius: 4, letterSpacing: '0.06em',
              background: 'var(--accent)', color: '#fff',
            }}>NEW</span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0, padding: '8px 36px 8px 10px' }}>
          <p style={{
            fontSize: 12, fontWeight: 600, margin: '0 0 4px', lineHeight: 1.4,
            color: 'var(--text-primary)',
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {video.title}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', fontSize: 10, color: 'var(--text-secondary)' }}>
            <span>
              {video.channelTitle}
              {video.publishedAt ? ` · ${formatDate(video.publishedAt)}` : ''}
              {video.viewCount > 0 ? ` · ▶ ${fmt(video.viewCount)}` : ''}
            </span>
            {badge && (
              <span style={{
                fontSize: 9, padding: '1px 5px', borderRadius: 4,
                background: badge.bg, color: badge.color, fontWeight: 700,
              }}>{badge.text}</span>
            )}
          </div>
        </div>
      </a>
      {onToggleBookmark && (
        <button
          onClick={() => onToggleBookmark(video)}
          style={{
            position: 'absolute', top: 6, right: 6,
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: 16, padding: '2px 4px',
            color: bookmarked ? 'var(--accent)' : 'var(--text-secondary)',
            transition: 'color 0.2s',
          }}
          title={bookmarked ? 'ブックマーク解除' : 'ブックマーク'}
        >
          {bookmarked ? '♥' : '♡'}
        </button>
      )}
    </div>
  );
}

// =====================
// 連続再生ボタン（セクション見出し横に置く小型ボタン）
// =====================
export function PlayAllButton({ queue, label = '▶ 連続再生' }) {
  const player = usePlayer();
  if (!player || !queue || queue.filter(v => v.videoId).length === 0) return null;
  return (
    <button
      onClick={() => player.openPlayer(queue, 0)}
      style={{
        background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
        border: 'none', borderRadius: 20, padding: '4px 13px',
        color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer',
        boxShadow: '0 2px 12px rgba(232,64,160,0.35)',
      }}
    >
      {label}
    </button>
  );
}

// =====================
// ローディングスピナー
// =====================
export function Spinner({ label }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)' }}>
      <div style={{
        width: 32, height: 32,
        border: '3px solid var(--border-subtle)', borderTop: '3px solid var(--accent)',
        borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {label && <p style={{ fontSize: 13, margin: 0 }}>{label}</p>}
    </div>
  );
}
