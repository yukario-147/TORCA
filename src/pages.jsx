// src/pages.jsx
// メンバーページ / メンバー最新クリップフィード

import { D } from "./theme.js";
import { xUrl, tkUrl } from "./data.js";
import { ClipRow, Spinner } from "./components.jsx";
import { useYouTubeFeed } from "./useFeed.js";
import { useBookmarks } from "./storage.js";

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
  const visible = items.slice(0, limit);
  return (
    <div style={{ marginBottom: 14 }}>
      {visible.map((v, i) => (
        <ClipRow key={v.videoId} video={v} queue={visible} queueIndex={i} bookmarked={has(v.videoId)} onToggleBookmark={toggle} />
      ))}
    </div>
  );
}

// =====================
// メンバーページ
// =====================
export function MemberPage({ artist, member, onBack }) {
  return (
    <div>
      <button onClick={onBack} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: "6px 14px", color: D.text, cursor: "pointer", fontSize: 12, fontWeight: 600, marginBottom: 16 }}>← 戻る</button>
      <div style={{ background: `linear-gradient(135deg,${member.color}30,${member.color}08)`, border: `1px solid ${member.color}40`, borderRadius: 18, padding: "22px 20px", marginBottom: 18, textAlign: "center" }}>
        <div style={{ fontSize: 60, marginBottom: 8 }}>{member.emoji}</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: D.text }}>{member.name}</div>
        <div style={{ fontSize: 10, color: member.color, fontWeight: 600, marginTop: 3 }}>{member.nickname}</div>
        <div style={{ fontSize: 10, color: D.textSub, fontStyle: "italic", marginTop: 4, lineHeight: 1.5 }}>「{member.catchphrase}」</div>
        <div style={{ fontSize: 9, color: D.textMuted, marginTop: 4 }}>{artist.name}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
          <a href={xUrl(`${member.name} (推しカメラ OR 撮可) filter:native_video`)} target="_blank" rel="noopener noreferrer"
            style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${D.border}`, borderRadius: 10, padding: "8px 14px", color: D.text, fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
            𝕏 で {member.name} の撮可 ↗
          </a>
          <a href={tkUrl(member.name + " 推しカメラ")} target="_blank" rel="noopener noreferrer"
            style={{ background: "rgba(255,0,80,0.1)", border: "1px solid rgba(255,0,80,0.2)", borderRadius: 10, padding: "8px 14px", color: "#ff6080", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
            🎵 TikTokで ↗
          </a>
        </div>
      </div>

      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>📡 {member.name}の最新クリップ</div>
      <MemberFeed member={member} limit={10} />
    </div>
  );
}
