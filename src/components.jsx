// src/components.jsx
// 共通 UI コンポーネント

import { useState } from "react";
import { fmt, formatDate } from "./theme.js";
import { usePlayer } from "./playerContext.js";
import { isNewSince } from "./storage.js";
import { OFFICIAL_SITE } from "./data.js";
import { Icon } from "./icons.jsx";

export function Notice({ msg, style }) {
  if (!msg) return null;
  return <div className={`notice notice-${msg.kind}`} style={style}>{msg.text}</div>;
}

// =====================
// 見出し
// =====================
export function PageHead({ title, desc, children }) {
  return (
    <div className="page-head">
      <h1 className="page-title">{title}<span className="spark">✦</span></h1>
      {desc && <p className="page-desc">{desc}</p>}
      {children}
    </div>
  );
}

export function SectionHead({ eyebrow, title, action, style }) {
  return (
    <div className="sec-head" style={style}>
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <div className="sec-title">{title}</div>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon = "✦", title, children, actions }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      {title && <div className="empty-title">{title}</div>}
      {children && <div className="empty-desc">{children}</div>}
      {actions && <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 14 }}>{actions}</div>}
    </div>
  );
}

export function PlatformTag({ cfg }) {
  return <span className="tag" style={{ background: cfg.soft, color: cfg.color }}>{cfg.tag || `${cfg.icon} ${cfg.label}`}</span>;
}

// =====================
// フッター
// =====================
export function Footer({ onNav }) {
  return (
    <footer className="footer">
      <div className="footer-links">
        {[["利用規約", "terms"], ["プライバシーポリシー", "privacy"], ["運営者情報", "about"], ["削除申請", "takedown"]].map(([label, t]) => (
          <button key={t} onClick={() => onNav(t)}>{label}</button>
        ))}
      </div>
      <a href={OFFICIAL_SITE} target="_blank" rel="noopener noreferrer"
        style={{ color: "var(--brand)", fontWeight: 700, textDecoration: "none", fontSize: 11 }}>
        きゅるりんってしてみて 公式サイト ↗
      </a>
      <div style={{ marginTop: 4 }}>
        TORCAは非公式のファンサービスです。著作権はきゅるりんってしてみて・ディアステージに帰属します。<br />
        © {new Date().getFullYear()} TORCA
      </div>
    </footer>
  );
}

// YouTube 実データの撮可バッジ判定（低スコアに「公式」を付けない：公式判定はチャンネル ID のみ）
function takaBadge(video) {
  if (video.isOfficial) return { text: "公式", bg: "var(--brand-soft)", color: "var(--brand)" };
  const score = video.takaScore;
  if (typeof score !== "number") return null;
  if (score >= 80) return { text: "📸 撮可", bg: "var(--ok-soft)", color: "var(--ok)" };
  if (score >= 50) return { text: "関連", bg: "var(--surface-2)", color: "var(--text-sub)" };
  return null;
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
    const idx = queueIndex ?? q.findIndex(v => v.videoId === video.videoId);
    player.openPlayer(q, Math.max(0, idx));
  };

  return (
    <div className="row-card">
      {rank != null && (
        <div style={{
          width: 28, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "flex-end",
          fontFamily: "var(--font-logo)", fontSize: 17, fontWeight: 700,
          color: rank <= 3 ? "var(--gold)" : "var(--text-muted)",
        }}>{rank}</div>
      )}
      <a href={`https://www.youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noopener noreferrer"
        onClick={handleOpen} className="row-link">
        <div className="row-thumb">
          {video.thumbnailUrl
            ? <img src={video.thumbnailUrl} alt="" loading="lazy" />
            : <div style={{ width: "100%", height: "100%" }} />}
          {canPlay && <span className="play-dot"><Icon name="play" size={13} /></span>}
          {isNew && (
            <span className="tag" style={{ position: "absolute", top: 5, left: 5, background: "var(--accent-grad)", color: "var(--on-accent)", fontSize: 8.5, padding: "1px 6px" }}>NEW</span>
          )}
        </div>
        <div className="row-body">
          <p className="row-title">{video.title}</p>
          <div className="row-meta">
            {badge && <span className="tag" style={{ background: badge.bg, color: badge.color }}>{badge.text}</span>}
            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {[video.channelTitle, video.publishedAt && formatDate(video.publishedAt), video.viewCount > 0 && `▶ ${fmt(video.viewCount)}`].filter(Boolean).join(" · ")}
            </span>
          </div>
        </div>
      </a>
      {onToggleBookmark && (
        <button onClick={() => onToggleBookmark(video)} className={`row-action${bookmarked ? " is-on" : ""}`}
          title={bookmarked ? "ブックマーク解除" : "ブックマーク"} aria-label={bookmarked ? "ブックマーク解除" : "ブックマーク"} aria-pressed={!!bookmarked}>
          <Icon name="heart" size={19} filled={bookmarked} />
        </button>
      )}
    </div>
  );
}

// =====================
// SNS 検索結果カード（X / TikTok / Instagram）
// タップでアプリ内埋め込みビューアを開き、♥ でアーカイブに保存する
// ・サムネイルあり（TikTok等）→ メディアカード
// ・サムネイルなし（X等）    → ポストカード（本文を主役にした引用風レイアウト）
// =====================
export function SnsRow({ item, saved, onToggleSave, onOpen, platformConfig: cfg }) {
  const [thumbBroken, setThumbBroken] = useState(false);
  const hasThumb = !!item.thumbnailUrl && !thumbBroken;

  return (
    <div className="row-card" style={hasThumb ? undefined : { borderLeft: `3px solid ${cfg.color}` }}>
      <a href={item.url} target="_blank" rel="noopener noreferrer"
        onClick={(e) => { e.preventDefault(); onOpen(item); }} className="row-link">
        {hasThumb && (
          <div className="row-thumb" style={{ width: 92, aspectRatio: "3 / 4" }}>
            <img src={item.thumbnailUrl} alt="" referrerPolicy="no-referrer" loading="lazy" onError={() => setThumbBroken(true)} />
            <span className="play-dot"><Icon name="play" size={13} /></span>
          </div>
        )}
        <div className="row-body" style={{ padding: "12px 42px 12px 13px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6, minWidth: 0 }}>
            <PlatformTag cfg={cfg} />
            {item.authorName && (
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-sub)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {item.authorName}
              </span>
            )}
          </div>
          <p className="row-title" style={{ WebkitLineClamp: hasThumb ? 3 : 4, fontWeight: hasThumb ? 700 : 500, fontSize: 13, lineHeight: 1.6 }}>
            {item.title}
          </p>
          {item.snippet && (
            <p style={{ fontSize: 11, color: "var(--text-sub)", marginTop: 5, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-word" }}>
              {item.snippet}
            </p>
          )}
          {!hasThumb && (
            <div style={{ fontSize: 10.5, color: "var(--accent-deep)", fontWeight: 800, marginTop: 8 }}>タップして表示 ›</div>
          )}
        </div>
      </a>
      <button onClick={() => onToggleSave(item)} className={`row-action${saved ? " is-on" : ""}`}
        title={saved ? "アーカイブから削除" : "アーカイブに保存"} aria-label={saved ? "アーカイブから削除" : "アーカイブに保存"} aria-pressed={!!saved}>
        <Icon name="heart" size={19} filled={saved} />
      </button>
    </div>
  );
}

// =====================
// 連続再生ボタン（セクション見出し横に置く小型ボタン）
// =====================
export function PlayAllButton({ queue, label = "連続再生" }) {
  const player = usePlayer();
  if (!player || !queue || !queue.some(v => v.videoId)) return null;
  return (
    <button onClick={() => player.openPlayer(queue, 0)} className="btn btn-primary btn-sm">
      <Icon name="play" size={12} />{label}
    </button>
  );
}

// =====================
// ローディング
// =====================
export function Spinner({ label }) {
  return (
    <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-sub)" }} role="status">
      <div className="spinner" />
      {label && <p style={{ fontSize: 12, fontWeight: 500 }}>{label}</p>}
    </div>
  );
}

export function SkeletonRows({ count = 3 }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton" style={{ height: 88, marginBottom: 10 }} />
      ))}
    </div>
  );
}
