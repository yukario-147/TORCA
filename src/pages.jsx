// src/pages.jsx
// アーティストページ / メンバーページ / クリップ詳細ビュー

import { D, fmt } from "./theme.js";
import { xUrl, tkUrl, findArtist, findMember, KYURUSHITE } from "./data.js";
import { Badge, VideoCard, ClipRow, Spinner } from "./components.jsx";
import { useYouTubeFeed } from "./useFeed.js";
import { useBookmarks } from "./storage.js";

// =====================
// アーティストページ
// =====================
export function ArtistPage({ artist, videos, onSelectVideo, onSelectMember, onSave, saved, onBack }) {
  const groupVideos = videos.filter(v => v.artistId === artist.id);
  return (
    <div>
      <button onClick={onBack} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: "6px 14px", color: D.text, cursor: "pointer", fontSize: 12, fontWeight: 600, marginBottom: 16 }}>← 戻る</button>
      <div style={{ background: `linear-gradient(135deg,${artist.color}25,${artist.color}05)`, border: `1px solid ${artist.color}30`, borderRadius: 18, padding: "20px 18px", marginBottom: 18, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ fontSize: 50 }}>{artist.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 19, fontWeight: 900, color: D.text, lineHeight: 1.2 }}>{artist.name}</div>
          <div style={{ fontSize: 10, color: artist.color, fontWeight: 700, marginTop: 2, letterSpacing: "0.06em" }}>「{artist.kana}」</div>
          <div style={{ fontSize: 11, color: D.textSub, marginTop: 6, lineHeight: 1.5 }}>{artist.description}</div>
        </div>
      </div>
      {artist.members.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>📷 メンバー別「推しカメラ」</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 22 }}>
            {artist.members.map(m => {
              const cnt = videos.filter(v => v.artistId === artist.id && v.focusMemberId === m.id).length;
              return (
                <button key={m.id} onClick={() => onSelectMember(m.id)}
                  style={{
                    background: `rgba(${m.colorRgb},0.1)`,
                    border: `1.5px solid rgba(${m.colorRgb},0.3)`,
                    borderRadius: 14, padding: 14, cursor: "pointer", textAlign: "center",
                    transition: "all 0.25s ease",
                  }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 20px rgba(${m.colorRgb},0.3)`}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                  <div style={{ fontSize: 32, marginBottom: 6 }}>{m.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: D.text }}>{m.name}</div>
                  <div style={{ fontSize: 9, color: m.color, marginTop: 2, fontWeight: 600 }}>{m.nickname}</div>
                  <div style={{ fontSize: 9, color: m.color, marginTop: 1, fontWeight: 700 }}>{cnt}件 ↗</div>
                </button>
              );
            })}
          </div>
        </>
      )}
      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>🎥 グループ全クリップ <span style={{ fontSize: 10, color: D.textMuted, fontWeight: 400, marginLeft: 6 }}>{groupVideos.length}件</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {groupVideos.map(v => <VideoCard key={v.id} v={v} onSelect={onSelectVideo} onSave={onSave} isSaved={saved.includes(v.id)} />)}
      </div>
    </div>
  );
}

// =====================
// メンバー最新クリップ（YouTube 実データ）
// MyTab と MemberPage で共用。キャッシュキーをメンバー ID で共有する
// =====================
export function MemberFeed({ member, limit = 5 }) {
  const { items, loading, error } = useYouTubeFeed(
    `member_${member.id}`,
    { userInput: '', filters: { member: member.name, period: 'all' } },
  );
  const { toggle, has } = useBookmarks();

  if (loading) return <Spinner label={`${member.name}のクリップを検索中…`} />;
  if (error || items.length === 0) return (
    <div style={{ background: D.surface, borderRadius: 12, padding: 16, textAlign: "center", color: D.textMuted, fontSize: 11, marginBottom: 18, lineHeight: 1.6 }}>
      最新クリップを取得できませんでした。<br />検索タブから「{member.name}」で探してみてください。
    </div>
  );
  return (
    <div style={{ marginBottom: 14 }}>
      {items.slice(0, limit).map(v => (
        <ClipRow key={v.videoId} video={v} bookmarked={has(v.videoId)} onToggleBookmark={toggle} />
      ))}
    </div>
  );
}

// =====================
// メンバーページ
// =====================
export function MemberPage({ artist, member, videos, onSelectVideo, onSave, saved, onBack }) {
  const memberVideos = videos.filter(v => v.artistId === artist.id && v.focusMemberId === member.id);
  return (
    <div>
      <button onClick={onBack} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: "6px 14px", color: D.text, cursor: "pointer", fontSize: 12, fontWeight: 600, marginBottom: 16 }}>← 戻る</button>
      <div style={{ background: `linear-gradient(135deg,${member.color}30,${member.color}08)`, border: `1px solid ${member.color}40`, borderRadius: 18, padding: "22px 20px", marginBottom: 18, textAlign: "center" }}>
        <div style={{ fontSize: 60, marginBottom: 8 }}>{member.emoji}</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: D.text }}>{member.name}</div>
        <div style={{ fontSize: 10, color: member.color, fontWeight: 600, marginTop: 3 }}>{member.nickname}</div>
        <div style={{ fontSize: 10, color: D.textSub, fontStyle: "italic", marginTop: 4, lineHeight: 1.5 }}>「{member.catchphrase}」</div>
        <div style={{ fontSize: 9, color: D.textMuted, marginTop: 4 }}>{artist.name}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
          <a href={xUrl(member.name + " 推しカメラ")} target="_blank" rel="noopener noreferrer"
            style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${D.border}`, borderRadius: 10, padding: "8px 14px", color: D.text, fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
            𝕏 で {member.name} ↗
          </a>
          <a href={tkUrl(member.name + " 推しカメラ")} target="_blank" rel="noopener noreferrer"
            style={{ background: "rgba(255,0,80,0.1)", border: "1px solid rgba(255,0,80,0.2)", borderRadius: 10, padding: "8px 14px", color: "#ff6080", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
            🎵 TikTokで ↗
          </a>
        </div>
      </div>

      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>📡 {member.name}の最新クリップ</div>
      <MemberFeed member={member} limit={8} />

      {memberVideos.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>📷 推しカメラ <span style={{ fontSize: 10, color: D.textMuted, fontWeight: 400, marginLeft: 6 }}>{memberVideos.length}件</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {memberVideos.map(v => <VideoCard key={v.id} v={v} onSelect={onSelectVideo} onSave={onSave} isSaved={saved.includes(v.id)} showFocus={false} />)}
          </div>
        </>
      )}
    </div>
  );
}

// =====================
// 詳細ビュー
// =====================
export function DetailView({ v, onBack, onSave, isSaved }) {
  const artist = findArtist(v.artistId) || KYURUSHITE;
  const focusMember = v.focusMemberId ? findMember(v.artistId, v.focusMemberId) : null;
  const heroColor = focusMember?.color || artist.color;
  return (
    <div style={{ background: D.bg, width: "100%", height: "100dvh", color: D.text, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", background: D.surface, borderBottom: `1px solid ${D.border}`, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${D.border}`, borderRadius: 10, padding: "8px 16px", color: D.text, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>← 戻る</button>
        <span style={{ fontSize: 13, color: D.textSub, flex: 1 }}>クリップ詳細</span>
        <button onClick={() => onSave(v.id)} style={{ background: isSaved ? "rgba(232,67,147,0.15)" : "rgba(255,255,255,0.06)", border: `1px solid ${isSaved ? "rgba(232,67,147,0.3)" : D.border}`, borderRadius: 10, padding: "8px 16px", color: isSaved ? D.pink : D.textSub, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          {isSaved ? "♥ 保存済み" : "♡ 保存"}
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ height: 200, background: `linear-gradient(135deg,${heroColor}30,${heroColor}08)`, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 70, marginBottom: 18, border: `1px solid ${heroColor}30`, position: "relative" }}>
            {focusMember?.emoji || artist.emoji}
            <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 5 }}>
              <Badge variant={v.quality}>{v.quality}</Badge>
              {focusMember && <Badge variant="push">📷 {focusMember.name}</Badge>}
              {v.isOfficial && <Badge variant="official">✓ 撮可</Badge>}
            </div>
            <a href={v.sourceUrl} target="_blank" rel="noopener noreferrer"
              style={{ position: "absolute", bottom: 12, right: 12, background: "var(--accent)", borderRadius: 12, padding: "10px 18px", color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
              ▶ {v.source}で見る ↗
            </a>
          </div>
          <div style={{ fontSize: 11, color: artist.color, fontWeight: 700, marginBottom: 4 }}>{artist.name}</div>
          <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 14 }}>「{v.song}」</div>
          {focusMember && (
            <div style={{ background: `${focusMember.color}15`, border: `1px solid ${focusMember.color}30`, borderRadius: 12, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>{focusMember.emoji}</span>
              <div>
                <div style={{ fontSize: 10, color: focusMember.color, fontWeight: 700 }}>📷 推しカメラ対象</div>
                <div style={{ fontSize: 13, fontWeight: 800 }}>{focusMember.name}</div>
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            {[["📍 会場", v.venue], ["📅 日付", v.date], ["🎬 画質", v.quality], ["📱 投稿元", v.source]].map(([l, val]) => (
              <div key={l} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 12, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: D.textMuted, marginBottom: 3 }}>{l}</div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{val}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
            {[["▶ 再生", fmt(v.views)], ["♥ いいね", fmt(v.likes)]].map(([l, val], i) => (
              <div key={l} style={{ flex: 1, padding: "14px 0", textAlign: "center", borderRight: i === 0 ? `1px solid ${D.border}` : "none" }}>
                <div style={{ fontSize: 19, fontWeight: 900 }}>{val}</div>
                <div style={{ fontSize: 10, color: D.textMuted, marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "#fbbf24", fontWeight: 800, marginBottom: 6 }}>⚠ 権利・著作権について</div>
            <div style={{ fontSize: 11, color: "#d4a84b", lineHeight: 1.7 }}>このクリップはアーティスト・主催者が定めた「撮影可能区間（撮可）」のルールに基づく映像です。当サービスは動画を直接ホスティングせず、元投稿リンクの表示のみを行います。著作権はアーティスト、レーベル、撮影者に帰属します。</div>
          </div>
          {v.note && (
            <div style={{ background: D.accentBg, border: "1px solid rgba(255,105,180,0.2)", borderRadius: 12, padding: "10px 14px", marginBottom: 14, fontSize: 11, color: D.textSub, lineHeight: 1.6 }}>
              📌 {v.note}
            </div>
          )}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {v.tags.map(t => (
              <a key={t} href={xUrl(t)} target="_blank" rel="noopener noreferrer"
                style={{ background: D.accentBg, border: "1px solid rgba(255,105,180,0.2)", borderRadius: 8, padding: "4px 10px", fontSize: 11, color: D.accentLight, textDecoration: "none" }}>{t} ↗</a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
