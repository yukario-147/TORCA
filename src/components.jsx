// src/components.jsx
// 共通 UI コンポーネント（Badge / Footer / VideoCard / ClipRow / Spinner）

import { useState } from "react";
import { D, fmt, formatDate } from "./theme.js";
import { findArtist, findMember, KYURUSHITE } from "./data.js";

export function Badge({ children, variant = "default" }) {
  const map = {
    default:  { background: D.accentBg, color: D.accentLight, border: "1px solid rgba(255,105,180,0.25)" },
    "4K":     { background: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.3)" },
    "1080p":  { background: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)" },
    "720p":   { background: "rgba(100,116,139,0.2)", color: "#94a3b8", border: "1px solid rgba(100,116,139,0.3)" },
    official: { background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" },
    trending: { background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" },
    ai:       { background: "rgba(255,105,180,0.2)", color: "#ff8ec7", border: "1px solid rgba(255,105,180,0.4)" },
    source:   { background: "rgba(255,255,255,0.06)", color: D.textSub, border: `1px solid ${D.border}` },
    push:     { background: "rgba(232,67,147,0.15)", color: "#f472b6", border: "1px solid rgba(232,67,147,0.3)" },
  };
  const st = map[variant] || map.default;
  return (
    <span style={{ ...st, borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", display: "inline-flex", alignItems: "center", gap: 3 }}>
      {children}
    </span>
  );
}

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

// =====================
// ビデオカード（デモデータ用グリッドカード）
// =====================
export function VideoCard({ v, onSelect, onSave, isSaved, showFocus = true }) {
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  const artist = findArtist(v.artistId) || KYURUSHITE;
  const focusMember = v.focusMemberId ? findMember(v.artistId, v.focusMemberId) : null;
  return (
    <div
      onClick={() => onSelect(v)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        background: hover ? "#1c1b2e" : "#14141e",
        border: `1px solid ${hover ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 14, overflow: "hidden", cursor: "pointer",
        transition: "all 0.22s cubic-bezier(0.4,0,0.2,1)",
        transform: pressed ? "scale(0.97)" : hover ? "translateY(-3px) scale(1.02)" : "scale(1)",
        boxShadow: hover ? "0 10px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)" : "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <div style={{ height: 90, background: `linear-gradient(135deg,${(focusMember?.color || artist.color)}25,${(focusMember?.color || artist.color)}06)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, position: "relative", borderBottom: `1px solid ${D.border}` }}>
        {focusMember?.emoji || artist.emoji}
        <div style={{ position: "absolute", top: 6, left: 6, display: "flex", gap: 3, flexWrap: "wrap" }}>
          <Badge variant={v.quality}>{v.quality}</Badge>
          {v.trending && <Badge variant="trending">🔥</Badge>}
        </div>
        <div style={{ position: "absolute", top: 6, right: 6 }}>
          <Badge variant="source">{v.source}</Badge>
        </div>
        {showFocus && focusMember && (
          <div style={{ position: "absolute", bottom: 6, left: 6 }}>
            <Badge variant="push">📷 {focusMember.name}</Badge>
          </div>
        )}
        {!focusMember && v.isOfficial && (
          <div style={{ position: "absolute", bottom: 6, left: 6 }}>
            <Badge variant="official">✓ 撮可</Badge>
          </div>
        )}
      </div>
      <div style={{ padding: "10px 12px 9px" }}>
        <div style={{ fontSize: 10, color: focusMember?.color || artist.color, fontWeight: 700, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {focusMember ? focusMember.name : artist.name}
        </div>
        <div style={{ fontSize: 12, fontWeight: 800, color: D.text, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>「{v.song}」</div>
        <div style={{ fontSize: 10, color: D.textMuted, marginBottom: 7 }}>📍 {v.venue}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: D.textMuted }}>▶ {fmt(v.views)}</span>
          <button
            key={String(isSaved)}
            onClick={e => { e.stopPropagation(); onSave(v.id); }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 15, color: isSaved ? D.pink : D.textMuted,
              padding: "2px 4px", lineHeight: 1,
              animation: isSaved ? "savePop 0.38s cubic-bezier(0.68,-0.55,0.27,1.55)" : undefined,
              transition: "color 0.2s ease",
            }}>
            {isSaved ? "♥" : "♡"}
          </button>
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
// =====================
export function ClipRow({ video, bookmarked, onToggleBookmark, rank }) {
  const badge = takaBadge(video);
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
        style={{ display: 'flex', textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 0 }}
      >
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            style={{ width: 120, height: 68, objectFit: 'cover', flexShrink: 0 }}
          />
        ) : (
          <div style={{
            width: 120, height: 68, flexShrink: 0, background: '#1a1828',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)', fontSize: 20,
          }}>▶</div>
        )}
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
