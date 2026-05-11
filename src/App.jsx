import { useState, useEffect } from "react";
import Onboarding from './Onboarding.jsx';
import Splash from './Splash.jsx';
import { buildQuery, buildSnsUrls, periodToPublishedAfter } from './searchDict.js';

const xUrl = (q) => `https://x.com/search?q=${encodeURIComponent(q)}&f=live`;
const tkUrl = (q) => `https://www.tiktok.com/search?q=${encodeURIComponent(q)}`;

// =====================
// きゅるして専用データ
// =====================
const KYURUSHITE = {
  id: "kyurushite",
  name: "きゅるりんってしてみて",
  kana: "きゅるして",
  type: "group",
  color: "#FF69B4",
  emoji: "💗",
  description: "ディアステージ所属の4人組アイドルグループ。「カワイイ・リアリズム」をコンセプトに活動。",
  searchTerms: ["きゅるして", "きゅるりんってしてみて"],
  members: [
    { id: "uta",  name: "島村嬉唄",   kana: "しまむらうた",   color: "#FFD700", colorRgb: "255,215,0",   emoji: "💛", catchphrase: "最恐かわいい、歌姫べびちゃん", nickname: "うたちゃん / うちゃたん" },
    { id: "yane", name: "環やね",     kana: "たまきやね",     color: "#9B59B6", colorRgb: "155,89,182",  emoji: "💜", catchphrase: "安心安全女神リーダー",         nickname: "やねちゃん / やねぴ" },
    { id: "yuna", name: "チバゆな",   kana: "ちばゆな",       color: "#FF69B4", colorRgb: "255,105,180", emoji: "🩷", catchphrase: "みんなの元カノ",              nickname: "ゆなちゃん" },
    { id: "amu",  name: "逃げ水あむ", kana: "にげみずあむ",   color: "#E74C3C", colorRgb: "231,76,60",   emoji: "❤️", catchphrase: "赤い喜ばせ屋",               nickname: "あむちゃん / あむち" },
  ],
};

const ARTISTS = [KYURUSHITE];
const findArtist = (id) => ARTISTS.find(a => a.id === id);
const findMember = (artistId, memberId) => findArtist(artistId)?.members.find(m => m.id === memberId);

const INITIAL_VIDEOS = [
  {
    id: 1, artistId: "kyurushite", focusMemberId: null, memberIds: ["uta","yane","yuna","amu"],
    song: "らぶきゅん♡うぉんてっど", venue: "Zepp Nagoya", date: "2025-03-28", quality: "4K", source: "X",
    sourceUrl: xUrl("#きゅるして撮可"), tags: ["#きゅるして撮可", "#ZeppNagoya"],
    views: 28400, likes: 2340, isOfficial: true, isAI: false, trending: true,
    note: "Zeppツアー「Kyururin Wonderland」初日公演のデモ表示です。",
  },
  {
    id: 2, artistId: "kyurushite", focusMemberId: "uta", memberIds: ["uta"],
    song: "きゅるりんしてみて", venue: "日比谷野外音楽堂", date: "2025-01-25", quality: "4K", source: "X",
    sourceUrl: xUrl("島村嬉唄 推しカメラ"), tags: ["#うたちゃん", "#きゅるして", "#推しカメラ"],
    views: 18200, likes: 1620, isOfficial: true, isAI: false, trending: true,
    note: "島村嬉唄の推しカメラ動画のデモ表示です。",
  },
  {
    id: 3, artistId: "kyurushite", focusMemberId: "yane", memberIds: ["yane"],
    song: "きゅるりんしてみて", venue: "日比谷野外音楽堂", date: "2025-01-25", quality: "4K", source: "TikTok",
    sourceUrl: tkUrl("環やね 推しカメラ"), tags: ["#環やね", "#やねっち", "#推しカメラ"],
    views: 21500, likes: 1980, isOfficial: true, isAI: false, trending: false,
    note: "環やねの推しカメラ動画のデモ表示です。",
  },
  {
    id: 4, artistId: "kyurushite", focusMemberId: "yuna", memberIds: ["yuna"],
    song: "♡♡♡わんだーらんど", venue: "Kanadevia Hall", date: "2025-06-06", quality: "1080p", source: "X",
    sourceUrl: xUrl("チバゆな 推しカメラ"), tags: ["#チバゆな", "#推しカメラ"],
    views: 15800, likes: 1420, isOfficial: true, isAI: false, trending: false,
    note: "チバゆなの推しカメラ動画のデモ表示です。",
  },
  {
    id: 5, artistId: "kyurushite", focusMemberId: "amu", memberIds: ["amu"],
    song: "♡♡♡わんだーらんど", venue: "Kanadevia Hall", date: "2025-06-06", quality: "4K", source: "TikTok",
    sourceUrl: tkUrl("逃げ水あむ 推しカメラ"), tags: ["#逃げ水あむ", "#あむあむ", "#推しカメラ"],
    views: 33400, likes: 3120, isOfficial: true, isAI: false, trending: true,
    note: "逃げ水あむの推しカメラ動画のデモ表示です。",
  },
  {
    id: 6, artistId: "kyurushite", focusMemberId: "uta", memberIds: ["uta", "yane"],
    song: "Special♡Spell", venue: "Zepp Shinjuku", date: "2025-04-06", quality: "4K", source: "TikTok",
    sourceUrl: tkUrl("島村嬉唄 ファンカム"), tags: ["#うたちゃん", "#ファンカム"],
    views: 19200, likes: 1750, isOfficial: true, isAI: false, trending: false,
    note: "ファンカム動画のデモ表示です。",
  },
];

const QUALITIES = ["すべて", "4K", "1080p", "720p"];
const SOURCES = ["すべて", "X", "TikTok"];
const fmt = (n) => n >= 10000 ? (n / 10000).toFixed(1) + "万" : n.toLocaleString();

const DEFAULT_ACCENT = "#FF69B4";
const DEFAULT_ACCENT_RGB = "255,105,180";
const ACCENT_RGB_MAP = {
  "#FFD700": "255,215,0",
  "#9B59B6": "155,89,182",
  "#FF69B4": "255,105,180",
  "#E74C3C": "231,76,60",
};
function applyAccent(color) {
  const el = document.documentElement;
  el.style.setProperty("--accent", color);
  el.style.setProperty("--accent-rgb", ACCENT_RGB_MAP[color] || DEFAULT_ACCENT_RGB);
}

function useBreakpoint() {
  const [bp, setBp] = useState("mobile");
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w >= 1024) setBp("desktop");
      else if (w >= 640) setBp("tablet");
      else setBp("mobile");
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return bp;
}

const D = {
  bg: "#0c0c12", surface: "#13131e", surfaceHover: "#1c1c2a",
  border: "rgba(255,255,255,0.07)", borderHover: "rgba(255,255,255,0.14)",
  text: "#f0eeff", textSub: "#8a82b0", textMuted: "#4a4570",
  accent: DEFAULT_ACCENT, accentLight: "#ff8ec7", accentBg: "rgba(255,105,180,0.12)",
  pink: "#e84393", gold: "#f59e0b", green: "#10b981", red: "#ef4444",
};

function Badge({ children, variant = "default" }) {
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
function Footer({ onNav }) {
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
// ビデオカード
// =====================
function VideoCard({ v, onSelect, onSave, isSaved, showFocus = true }) {
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


// =====================
// アーティストページ
// =====================
function ArtistPage({ artist, videos, onSelectVideo, onSelectMember, onSave, saved, onBack }) {
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
// メンバーページ
// =====================
function MemberPage({ artist, member, videos, onSelectVideo, onSave, saved, onBack }) {
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
      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>📷 推しカメラ <span style={{ fontSize: 10, color: D.textMuted, fontWeight: 400, marginLeft: 6 }}>{memberVideos.length}件</span></div>
      {memberVideos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: D.textMuted, fontSize: 13 }}>まだクリップがありません</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {memberVideos.map(v => <VideoCard key={v.id} v={v} onSelect={onSelectVideo} onSave={onSave} isSaved={saved.includes(v.id)} showFocus={false} />)}
        </div>
      )}
    </div>
  );
}

// =====================
// 詳細ビュー
// =====================
function DetailView({ v, onBack, onSave, isSaved }) {
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

// =====================
// 検索タブ
// =====================
const MEMBERS_FILTER = [
  { id: 'all', label: '全員', emoji: '💛💜🩷❤️' },
  { id: '島村嬉唄', label: '島村嬉唄', emoji: '💛', color: '#FFD700' },
  { id: '環やね',   label: '環やね',   emoji: '💜', color: '#9B59B6' },
  { id: 'チバゆな', label: 'チバゆな', emoji: '🩷', color: '#FF69B4' },
  { id: '逃げ水あむ',label: '逃げ水あむ',emoji: '❤️', color: '#E74C3C' },
];

const VENUES_FILTER = [
  { id: '', label: '会場指定なし' },
  { id: '幕張', label: '幕張イベントホール' },
  { id: 'Kアリーナ', label: 'Kアリーナ横浜' },
  { id: 'zepp新宿', label: 'Zepp Shinjuku' },
  { id: '日比谷', label: '日比谷野外音楽堂' },
  { id: 'zepp名古屋', label: 'Zepp Nagoya' },
  { id: 'かなでびあ', label: 'Kanadevia Hall' },
];

const PERIODS_FILTER = [
  { id: 'all', label: 'すべての期間' },
  { id: 'month', label: '直近1ヶ月' },
  { id: 'week', label: '直近1週間' },
];

const SNS_PLATFORMS = [
  { id: 'youtube', label: 'YouTube', icon: '▶', color: '#FF0000' },
  { id: 'x',       label: 'X (Twitter)', icon: '✕', color: '#1DA1F2' },
  { id: 'tiktok',  label: 'TikTok', icon: '♪', color: '#69C9D0' },
  { id: 'instagram',label: 'Instagram', icon: '◎', color: '#E1306C' },
];

function SearchTab() {
  const [query, setQuery] = useState('');
  const [memberFilter, setMemberFilter] = useState('all');
  const [venueFilter, setVenueFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [activePlatforms, setActivePlatforms] = useState(['youtube', 'x', 'tiktok', 'instagram']);
  const [sortMode, setSortMode] = useState('relevance');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nextPageToken, setNextPageToken] = useState(null);
  const [searched, setSearched] = useState(false);
  const [snsUrls, setSnsUrls] = useState({});
  const [detectedInfo, setDetectedInfo] = useState(null);
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('torca_bookmarks') || '[]');
    } catch { return []; }
  });

  const saveBookmarks = (bms) => {
    setBookmarks(bms);
    localStorage.setItem('torca_bookmarks', JSON.stringify(bms));
  };

  const toggleBookmark = (video) => {
    const exists = bookmarks.find(b => b.videoId === video.videoId);
    if (exists) {
      saveBookmarks(bookmarks.filter(b => b.videoId !== video.videoId));
    } else {
      saveBookmarks([...bookmarks, { ...video, savedAt: new Date().toISOString() }]);
    }
  };

  const isBookmarked = (videoId) => bookmarks.some(b => b.videoId === videoId);

  const togglePlatform = (id) => {
    setActivePlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const scoreVideo = (video, q) => {
    let score = 0;
    const title = (video.title || '').toLowerCase();
    const desc = (video.description || '').toLowerCase();
    const lq = q.toLowerCase();
    if (title.includes('撮可')) score += 30;
    if (title.includes('きゅるして') || title.includes('きゅるりん')) score += 20;
    if (lq && title.includes(lq)) score += 25;
    if (lq && desc.includes(lq)) score += 10;
    const daysOld = (Date.now() - new Date(video.publishedAt).getTime()) / (1000 * 86400);
    if (daysOld < 7) score += 20;
    else if (daysOld < 30) score += 10;
    return score;
  };

  const sortResults = (items, mode, q) => {
    if (mode === 'date') {
      return [...items].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    } else if (mode === 'relevance') {
      return [...items].sort((a, b) => scoreVideo(b, q) - scoreVideo(a, q));
    }
    return items;
  };

  const doSearch = async (pageToken = null) => {
    const filters = {
      member: memberFilter !== 'all' ? memberFilter : null,
      venue: venueFilter || null,
      period: periodFilter,
    };

    const { youtubeQuery, snsQuery, detectedMembers, detectedVenues } = buildQuery(query, filters);
    const publishedAfter = periodToPublishedAfter(periodFilter);
    const snsLinks = buildSnsUrls(snsQuery, activePlatforms);

    setSnsUrls(snsLinks);
    setDetectedInfo({ detectedMembers, detectedVenues, youtubeQuery });
    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const params = new URLSearchParams({ q: youtubeQuery, maxResults: '20' });
      if (publishedAfter) params.append('publishedAfter', publishedAfter);
      if (pageToken) params.append('pageToken', pageToken);

      const res = await fetch(`/api/youtube-search?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Search failed');

      const sorted = sortResults(data.items || [], sortMode, query);
      if (pageToken) {
        setResults(prev => [...prev, ...sorted]);
      } else {
        setResults(sorted);
      }
      setNextPageToken(data.nextPageToken || null);
    } catch (err) {
      setError('検索に失敗しました。しばらくしてからもう一度お試しください。');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setResults([]);
    setNextPageToken(null);
    doSearch(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
  };

  return (
    <div style={{ padding: '0 0 80px 0' }}>
      <div style={{ padding: '20px 16px 0' }}>
        <h2 style={{
          fontSize: 20, fontWeight: 800, margin: '0 0 4px',
          background: 'linear-gradient(120deg, var(--accent-light), var(--accent2))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          撮可を探す
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
          YouTube検索 ＋ X / TikTok / Instagram への導線
        </p>

        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例：うたちゃんの幕張 / あむちゃんソロ / やねぴのダンスシーン"
            style={{
              width: '100%', padding: '14px 52px 14px 16px', borderRadius: 12,
              border: '1.5px solid var(--border-subtle)', background: 'var(--bg-card)',
              color: 'var(--text-primary)', fontSize: 15, outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
          />
          <button
            onClick={handleSearch}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              border: 'none', borderRadius: 8, padding: '8px 14px',
              color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >
            検索
          </button>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>メンバー</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {MEMBERS_FILTER.map(m => (
              <button
                key={m.id}
                onClick={() => setMemberFilter(m.id)}
                style={{
                  padding: '5px 12px', borderRadius: 20,
                  border: memberFilter === m.id ? `1.5px solid ${m.color || 'var(--accent)'}` : '1.5px solid var(--border-subtle)',
                  background: memberFilter === m.id ? `${m.color || 'var(--accent)'}22` : 'var(--bg-card)',
                  color: memberFilter === m.id ? (m.color || 'var(--accent)') : 'var(--text-secondary)',
                  fontSize: 12, fontWeight: memberFilter === m.id ? 700 : 400,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <select
            value={venueFilter}
            onChange={e => setVenueFilter(e.target.value)}
            style={{
              padding: '7px 10px', borderRadius: 8, border: '1.5px solid var(--border-subtle)',
              background: 'var(--bg-card)', color: 'var(--text-secondary)',
              fontSize: 12, cursor: 'pointer', flex: 1, minWidth: 140,
            }}
          >
            {VENUES_FILTER.map(v => (
              <option key={v.id} value={v.id}>{v.label}</option>
            ))}
          </select>
          <select
            value={periodFilter}
            onChange={e => setPeriodFilter(e.target.value)}
            style={{
              padding: '7px 10px', borderRadius: 8, border: '1.5px solid var(--border-subtle)',
              background: 'var(--bg-card)', color: 'var(--text-secondary)',
              fontSize: 12, cursor: 'pointer', flex: 1, minWidth: 120,
            }}
          >
            {PERIODS_FILTER.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>検索先SNS</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SNS_PLATFORMS.map(p => (
              <button
                key={p.id}
                onClick={() => togglePlatform(p.id)}
                style={{
                  padding: '5px 12px', borderRadius: 20,
                  border: activePlatforms.includes(p.id) ? `1.5px solid ${p.color}` : '1.5px solid var(--border-subtle)',
                  background: activePlatforms.includes(p.id) ? `${p.color}22` : 'var(--bg-card)',
                  color: activePlatforms.includes(p.id) ? p.color : 'var(--text-secondary)',
                  fontSize: 12, fontWeight: activePlatforms.includes(p.id) ? 700 : 400,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {searched && Object.keys(snsUrls).length > 0 && (
        <div style={{
          margin: '0 16px 16px', padding: '12px 14px', borderRadius: 10,
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8 }}>
            各SNSで同じクエリを検索する
            {detectedInfo?.detectedMembers?.length > 0 && (
              <span style={{ marginLeft: 8, color: 'var(--accent-light)' }}>
                📍 {detectedInfo.detectedMembers[0]}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SNS_PLATFORMS.filter(p => snsUrls[p.id]).map(p => (
              <a
                key={p.id}
                href={snsUrls[p.id]}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '6px 14px', borderRadius: 20,
                  background: `${p.color}22`, border: `1px solid ${p.color}44`,
                  color: p.color, fontSize: 12, fontWeight: 600, textDecoration: 'none',
                }}
              >
                {p.icon} {p.label}で開く
              </a>
            ))}
          </div>
        </div>
      )}

      {searched && !loading && results.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', marginBottom: 12,
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{results.length}件</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ id: 'relevance', label: '関連度' }, { id: 'date', label: '新しい順' }].map(s => (
              <button
                key={s.id}
                onClick={() => {
                  setSortMode(s.id);
                  setResults(prev => sortResults([...prev], s.id, query));
                }}
                style={{
                  padding: '4px 12px', borderRadius: 20,
                  border: sortMode === s.id ? '1.5px solid var(--accent)' : '1.5px solid var(--border-subtle)',
                  background: sortMode === s.id ? 'rgba(224,64,160,0.15)' : 'transparent',
                  color: sortMode === s.id ? 'var(--accent-light)' : 'var(--text-secondary)',
                  fontSize: 11, fontWeight: sortMode === s.id ? 700 : 400, cursor: 'pointer',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
          <div style={{
            width: 32, height: 32,
            border: '3px solid var(--border-subtle)', borderTop: '3px solid var(--accent)',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ fontSize: 13 }}>検索中...</p>
        </div>
      )}

      {error && (
        <div style={{
          margin: '0 16px', padding: '12px 16px', borderRadius: 10,
          background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.3)',
          color: '#e74c3c', fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {!searched && !loading && (
        <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
          <p style={{ fontSize: 14, margin: 0 }}>メンバー名やニックネームで検索してみよう</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>例：「あむちゃん 幕張」「やねぴのソロ」</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div style={{ padding: '0 16px' }}>
          {results.map(video => (
            <div
              key={video.videoId}
              style={{
                background: 'var(--bg-card)', borderRadius: 12,
                border: '1px solid var(--border-subtle)', marginBottom: 12, overflow: 'hidden',
              }}
            >
              <a
                href={`https://www.youtube.com/watch?v=${video.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
              >
                {video.thumbnail && (
                  <div style={{ position: 'relative' }}>
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      style={{ width: '100%', display: 'block', aspectRatio: '16/9', objectFit: 'cover' }}
                    />
                    <div style={{
                      position: 'absolute', bottom: 8, right: 8,
                      background: 'rgba(0,0,0,0.7)', borderRadius: 6, padding: '3px 8px',
                      color: '#fff', fontSize: 11, fontWeight: 700,
                    }}>
                      ▶ YouTube
                    </div>
                  </div>
                )}
              </a>
              <div style={{ padding: '10px 12px 12px' }}>
                <p style={{
                  fontSize: 13, fontWeight: 600, margin: '0 0 4px', lineHeight: 1.4,
                  display: '-webkit-box', WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {video.title}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{video.channelTitle}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 8 }}>{formatDate(video.publishedAt)}</span>
                  </div>
                  <button
                    onClick={() => toggleBookmark(video)}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18,
                      padding: '2px 4px',
                      color: isBookmarked(video.videoId) ? 'var(--accent)' : 'var(--text-secondary)',
                      transition: 'color 0.2s',
                    }}
                    title={isBookmarked(video.videoId) ? 'ブックマーク解除' : 'ブックマーク'}
                  >
                    {isBookmarked(video.videoId) ? '♥' : '♡'}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {nextPageToken && (
            <button
              onClick={() => doSearch(nextPageToken)}
              disabled={loading}
              style={{
                width: '100%', padding: '14px', borderRadius: 12,
                border: '1.5px solid var(--border-subtle)', background: 'var(--bg-card)',
                color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer', marginBottom: 16,
              }}
            >
              もっと見る
            </button>
          )}
        </div>
      )}

      {searched && !loading && results.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
          <p style={{ fontSize: 14, margin: 0 }}>動画が見つかりませんでした</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>別のキーワードを試してみてください</p>
        </div>
      )}
    </div>
  );
}

// =====================
// ホーム
// =====================
function HomeTab({ videos, profile, onSelectVideo, onSelectArtist, onSave, saved, onGoToMember }) {
  const [search, setSearch] = useState("");
  const [quality, setQuality] = useState("すべて");
  const [source, setSource] = useState("すべて");
  const [hoveredRankId, setHoveredRankId] = useState(null);

  const myMember = profile.memberId ? findMember("kyurushite", profile.memberId) : null;
  const recommendVideos = myMember
    ? videos.filter(v => v.artistId === "kyurushite" && (v.focusMemberId === profile.memberId || v.memberIds.includes(profile.memberId)))
    : videos.filter(v => v.artistId === "kyurushite");
  const trending = videos.filter(v => v.trending);
  const ranking = [...videos].sort((a, b) => b.views - a.views).slice(0, 5);

  const filtered = videos.filter(v => {
    const a = findArtist(v.artistId) || KYURUSHITE;
    return (
      (search === "" || a.name.includes(search) || a.kana.includes(search) || v.song.includes(search) || v.venue.includes(search)) &&
      (quality === "すべて" || v.quality === quality) &&
      (source === "すべて" || v.source === source)
    );
  });
  const isFiltering = search !== "" || quality !== "すべて" || source !== "すべて";

  return (
    <div>
      {/* きゅるして情報セクション */}
      <div style={{ background: "linear-gradient(135deg,rgba(255,105,180,0.12),rgba(255,105,180,0.02))", border: "1px solid rgba(255,105,180,0.2)", borderRadius: 18, padding: "14px 14px 16px", marginBottom: 16 }}>
        {/* タイトル */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: D.text }}>きゅるりんってしてみて</div>
          <div style={{ fontSize: 10, color: "#FF69B4", fontWeight: 700, marginTop: 2 }}>💗 撮可アーカイブ</div>
        </div>

        {/* 最新情報バナー */}
        {[
          { icon: "🎉", text: "Kアリーナ横浜ワンマン開催決定！" },
          { icon: "💿", text: "5thミニアルバム 2026年夏リリース決定！" },
        ].map(({ icon, text }) => (
          <div key={text} style={{
            background: "linear-gradient(135deg,rgba(var(--accent-rgb),0.15),rgba(var(--accent-rgb),0.05))",
            borderLeft: "3px solid var(--accent)",
            borderRadius: "0 10px 10px 0",
            padding: "8px 12px", marginBottom: 6,
            fontSize: 11, fontWeight: 700, color: D.text,
          }}>
            {icon} {text}
          </div>
        ))}

        {/* メンバーアイコン */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 12, marginTop: 12 }}>
          {KYURUSHITE.members.map(m => (
            <button key={m.id} onClick={() => onGoToMember(m.id)}
              style={{ background: `rgba(${m.colorRgb},0.1)`, border: `1.5px solid rgba(${m.colorRgb},0.3)`, borderRadius: 12, padding: "10px 4px", cursor: "pointer", textAlign: "center", transition: "all 0.25s ease" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: m.color, margin: "0 auto 5px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{m.emoji}</div>
              <div style={{ fontSize: 9, fontWeight: 800, color: D.text, lineHeight: 1.3 }}>{m.nickname.split(" /")[0]}</div>
            </button>
          ))}
        </div>

        {/* SNS導線 */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { label: "𝕏 公式", href: "https://x.com/KYURUSHITE" },
            { label: "🎵 TikTok", href: "https://www.tiktok.com/@kyurushite" },
            { label: "📸 Instagram", href: "https://www.instagram.com/kyurushite/" },
            { label: "▶ YouTube", href: "https://www.youtube.com/channel/UC38ULbpGgiA7t6i-lbLu9VQ" },
            { label: "💗 FC", href: "https://kyurushite.bitfan.id/" },
          ].map(({ label, href }) => (
            <a key={href} href={href} target="_blank" rel="noopener noreferrer"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "5px 10px", color: D.text, fontSize: 10, fontWeight: 600, textDecoration: "none", transition: "all 0.25s ease" }}>
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* 検索 */}
      <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.04)", border: `1px solid ${D.border}`, borderRadius: 12, padding: "9px 12px", gap: 8, marginBottom: 10 }}>
        <span style={{ color: D.textMuted, fontSize: 13 }}>🔍</span>
        <input style={{ background: "none", border: "none", outline: "none", color: D.text, fontSize: 13, flex: 1 }}
          placeholder="曲・会場で検索..." value={search} onChange={e => setSearch(e.target.value)} />
        {search && <span style={{ color: D.textMuted, cursor: "pointer", fontSize: 12 }} onClick={() => setSearch("")}>✕</span>}
      </div>
      <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 12, scrollbarWidth: "none" }}>
        {QUALITIES.map(q => (
          <button key={q} onClick={() => setQuality(q)}
            style={{ background: quality === q ? "var(--accent)" : "transparent", color: quality === q ? "#fff" : D.textSub, border: `1.5px solid ${quality === q ? "var(--accent)" : D.border}`, borderRadius: 8, padding: "3px 11px", fontSize: 11, fontWeight: quality === q ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.18s cubic-bezier(0.4,0,0.2,1)", transform: quality === q ? "scale(1.04)" : "scale(1)" }}>
            🎬 {q}
          </button>
        ))}
        {SOURCES.map(s => (
          <button key={s} onClick={() => setSource(s)}
            style={{ background: source === s ? "var(--accent)" : "transparent", color: source === s ? "#fff" : D.textSub, border: `1.5px solid ${source === s ? "var(--accent)" : D.border}`, borderRadius: 8, padding: "3px 11px", fontSize: 11, fontWeight: source === s ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.18s cubic-bezier(0.4,0,0.2,1)", transform: source === s ? "scale(1.04)" : "scale(1)" }}>
            📱 {s}
          </button>
        ))}
      </div>

      {isFiltering ? (
        <>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>検索結果 <span style={{ fontSize: 10, color: D.textMuted, fontWeight: 400 }}>{filtered.length}件</span></div>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: D.textMuted, fontSize: 13 }}>該当なし</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {filtered.map(v => <VideoCard key={v.id} v={v} onSelect={onSelectVideo} onSave={onSave} isSaved={saved.includes(v.id)} />)}
            </div>
          )}
        </>
      ) : (
        <>
          {recommendVideos.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: D.pink, letterSpacing: "0.1em", marginBottom: 2, fontWeight: 700 }}>FOR YOU</div>
                  <div style={{ fontSize: 15, fontWeight: 900 }}>
                    {myMember ? `${myMember.emoji} ${myMember.name}の推しカメラ` : "💗 きゅるして"}
                  </div>
                </div>
                <button onClick={() => onSelectArtist("kyurushite")}
                  style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: "5px 11px", fontSize: 11, color: D.textSub, cursor: "pointer", transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)" }}>
                  もっと見る ↗
                </button>
              </div>
              <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6, marginBottom: 22, scrollbarWidth: "none" }}>
                {recommendVideos.map(v => (
                  <div key={v.id} style={{ minWidth: 160, flexShrink: 0 }}>
                    <VideoCard v={v} onSelect={onSelectVideo} onSave={onSave} isSaved={saved.includes(v.id)} />
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: D.red, letterSpacing: "0.1em", marginBottom: 2, fontWeight: 700 }}>🔥 TRENDING</div>
            <div style={{ fontSize: 15, fontWeight: 900 }}>急上昇中のクリップ</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
            {trending.map(v => <VideoCard key={v.id} v={v} onSelect={onSelectVideo} onSave={onSave} isSaved={saved.includes(v.id)} />)}
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: D.gold, letterSpacing: "0.1em", marginBottom: 2, fontWeight: 700 }}>🏆 RANKING</div>
            <div style={{ fontSize: 15, fontWeight: 900 }}>再生数ランキング TOP5</div>
          </div>
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, overflow: "hidden" }}>
            {ranking.map((v, i) => {
              const a = findArtist(v.artistId) || KYURUSHITE;
              const fm = v.focusMemberId ? findMember(v.artistId, v.focusMemberId) : null;
              const isRowHovered = hoveredRankId === v.id;
              return (
                <div key={v.id} onClick={() => onSelectVideo(v)}
                  onMouseEnter={() => setHoveredRankId(v.id)}
                  onMouseLeave={() => setHoveredRankId(null)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderBottom: i < ranking.length - 1 ? `1px solid ${D.border}` : "none", cursor: "pointer", background: isRowHovered ? "rgba(255,255,255,0.04)" : "transparent", transition: "background 0.18s ease", transform: isRowHovered ? "translateX(3px)" : "translateX(0)" }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: i < 3 ? D.gold : D.textMuted, width: 22, textAlign: "center" }}>{i + 1}</div>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg,${(fm?.color || a.color)}25,${(fm?.color || a.color)}10)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{fm?.emoji || a.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 9, color: fm?.color || a.color, fontWeight: 700 }}>{fm ? fm.name : a.name}</div>
                    <div style={{ fontSize: 12, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>「{v.song}」</div>
                  </div>
                  <div style={{ fontSize: 10, color: D.textMuted, textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: D.text }}>{fmt(v.views)}</div>
                    <div>再生</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// =====================
// 推しタブ
// =====================
function MyTab({ profile, videos, onSelectVideo, onSelectMember, onSave, saved, onChangePush }) {
  const myMember = profile.memberId ? findMember("kyurushite", profile.memberId) : null;
  const accentColor = myMember?.color || DEFAULT_ACCENT;

  useEffect(() => {
    applyAccent(accentColor);
  }, [accentColor]);

  const memberVideos = myMember
    ? videos.filter(v => v.artistId === "kyurushite" && v.focusMemberId === myMember.id)
    : [];
  const groupVideos = videos.filter(v => v.artistId === "kyurushite");

  return (
    <div>
      <div style={{ background: `linear-gradient(135deg,${accentColor}30,${accentColor}06)`, border: `1px solid ${accentColor}40`, borderRadius: 18, padding: "20px 18px", marginBottom: 18, position: "relative" }}>
        <button onClick={onChangePush} style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.3)", border: `1px solid ${D.border}`, borderRadius: 8, padding: "4px 10px", color: D.textSub, fontSize: 10, cursor: "pointer" }}>変更</button>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 50 }}>{myMember?.emoji || "💗"}</div>
          <div>
            <div style={{ fontSize: 9, color: D.pink, letterSpacing: "0.1em", fontWeight: 700, marginBottom: 2 }}>YOUR PUSH</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: D.text }}>{myMember?.name || "きゅるして全員"}</div>
            {myMember && (
              <div style={{ fontSize: 10, color: myMember.color, fontWeight: 600, marginTop: 2 }}>{myMember.nickname}</div>
            )}
            <div style={{ fontSize: 10, color: D.textSub, marginTop: 2, fontStyle: myMember ? "italic" : "normal" }}>
              {myMember ? `「${myMember.catchphrase}」` : "きゅるりんってしてみて"}
            </div>
          </div>
        </div>
      </div>

      {myMember && (
        <>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>📷 {myMember.name}の推しカメラ <span style={{ fontSize: 10, color: D.textMuted, fontWeight: 400 }}>{memberVideos.length}件</span></div>
          {memberVideos.length === 0 ? (
            <div style={{ background: D.surface, borderRadius: 12, padding: 20, textAlign: "center", color: D.textMuted, fontSize: 12, marginBottom: 18 }}>まだクリップがありません</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
              {memberVideos.map(v => <VideoCard key={v.id} v={v} onSelect={onSelectVideo} onSave={onSave} isSaved={saved.includes(v.id)} showFocus={false} />)}
            </div>
          )}
        </>
      )}

      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>🎥 きゅるして全クリップ <span style={{ fontSize: 10, color: D.textMuted, fontWeight: 400 }}>{groupVideos.length}件</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
        {groupVideos.map(v => <VideoCard key={v.id} v={v} onSelect={onSelectVideo} onSave={onSave} isSaved={saved.includes(v.id)} />)}
      </div>

      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>💗 メンバーで絞り込む</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        {KYURUSHITE.members.map(m => {
          const active = m.id === myMember?.id;
          return (
            <button key={m.id} onClick={() => onSelectMember("kyurushite", m.id)}
              style={{
                background: active ? `rgba(${m.colorRgb},0.18)` : `rgba(${m.colorRgb},0.08)`,
                border: `1.5px solid rgba(${m.colorRgb},${active ? 0.8 : 0.3})`,
                borderRadius: 12, padding: 12, cursor: "pointer", textAlign: "center",
                boxShadow: active ? `0 0 30px rgba(${m.colorRgb},0.5)` : "none",
                transition: "all 0.3s ease",
              }}>
              <div style={{ fontSize: 26, marginBottom: 4 }}>{m.emoji}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: D.text }}>{m.name}</div>
              <div style={{ fontSize: 9, color: m.color, marginTop: 2, fontWeight: 600 }}>{m.nickname}</div>
              <div style={{ fontSize: 8, color: D.textMuted, marginTop: 1 }}>{m.catchphrase}</div>
            </button>
          );
        })}
      </div>

      {(() => {
        const bms = (() => {
          try { return JSON.parse(localStorage.getItem('torca_bookmarks') || '[]'); }
          catch { return []; }
        })();
        if (bms.length === 0) return null;
        return (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
              ♥ ブックマーク済み撮可動画
            </div>
            {bms.map(video => (
              <div key={video.videoId} style={{
                marginBottom: 10, padding: '10px 12px', borderRadius: 10,
                background: D.surface, border: `1px solid ${D.border}`,
              }}>
                <a
                  href={`https://www.youtube.com/watch?v=${video.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none', color: D.text, fontSize: 13, fontWeight: 600 }}
                >
                  {video.title}
                </a>
                <div style={{ fontSize: 11, color: D.textMuted, marginTop: 4 }}>
                  {video.channelTitle} · {new Date(video.publishedAt).toLocaleDateString('ja-JP')}
                </div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

// =====================
// 法的ページ
// =====================
function LegalSection({ title, body }) {
  return (
    <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, padding: 16, marginBottom: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6, color: D.accentLight }}>{title}</div>
      <div style={{ fontSize: 12, color: D.textSub, lineHeight: 1.8, whiteSpace: "pre-line" }}>{body}</div>
    </div>
  );
}

function TermsTab() {
  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 900, marginBottom: 16 }}>利用規約</div>
      <LegalSection title="サービスの目的" body="TORCAは、きゅるりんってしてみての撮影可能区間（撮可）映像を、X・TikTokから集約して閲覧しやすく整理する非公式ファンサービスです。" />
      <LegalSection title="動画の取り扱い" body="当サービスは動画を直接ホスティングせず、X・TikTokへの外部リンクのみを表示します。動画の著作権はアーティスト・レーベル・撮影者に帰属します。" />
      <LegalSection title="削除申請" body="著作権者または正当な代理人の方は、削除申請ページからお申し込みください。確認後、速やかに対応いたします。" />
      <LegalSection title="禁止事項" body={"以下の行為を禁止します：\n• 無断・不正な動画情報の投稿\n• アーティスト・ファンへの誹謗中傷\n• 他者へのなりすまし\n• 本サービスを利用した商業目的の行為"} />
      <LegalSection title="免責事項" body="当サービスは非公式であり、きゅるりんってしてみて及び関係各社とは一切無関係です。情報の正確性を保証するものではありません。" />
    </div>
  );
}

function PrivacyTab() {
  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 900, marginBottom: 16 }}>プライバシーポリシー</div>
      <LegalSection title="収集する情報" body="当サービスが収集する情報は、お客様が設定した「推しメンバー」のみです。この情報はお使いのデバイスのローカルストレージに保存され、サーバーには送信されません。" />
      <LegalSection title="個人情報の送信" body="当サービスはサーバーへの個人情報の送信を一切行いません。" />
      <LegalSection title="Cookieについて" body="当サービスはCookieを使用しません。" />
      <LegalSection title="外部サービス" body="X（旧Twitter）およびTikTokへのリンクを含みます。これらのサービスのプライバシーポリシーは各社のものに従います。" />
      <LegalSection title="お問い合わせ" body="プライバシーに関するご質問は下記までお問い合わせください。\ntorca.official@gmail.com" />
    </div>
  );
}

function AboutTab() {
  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 900, marginBottom: 16 }}>運営者情報</div>
      <div style={{ background: "linear-gradient(135deg,rgba(255,105,180,0.15),rgba(255,105,180,0.03))", border: "1px solid rgba(255,105,180,0.25)", borderRadius: 18, padding: "20px 18px", marginBottom: 14, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>💗</div>
        <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 6 }}>TORCA運営</div>
        <div style={{ fontSize: 12, color: D.textSub, lineHeight: 1.7 }}>
          きゅるしてのファンとして、ファンのために作りました。
        </div>
      </div>
      <LegalSection title="運営" body="TORCA運営（個人）" />
      <LegalSection title="連絡先" body="torca.official@gmail.com" />
      <LegalSection title="本サービスについて" body="TORCAはきゅるりんってしてみての非公式ファンサービスです。アーティスト・所属事務所・レーベルとは一切関係ありません。" />
    </div>
  );
}

function TakedownTab() {
  const [form, setForm] = useState({ name: "", email: "", url: "", reason: "" });

  const submit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent("【TORCA削除申請】" + form.url);
    const body = encodeURIComponent(`申請者名：${form.name}\nメールアドレス：${form.email}\n該当URL：${form.url}\n\n削除理由：\n${form.reason}`);
    window.location.href = `mailto:torca.official@gmail.com?subject=${subject}&body=${body}`;
  };

  const inputStyle = {
    width: "100%", background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10,
    padding: "11px 14px", color: D.text, fontSize: 13, outline: "none", boxSizing: "border-box",
  };

  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 900, marginBottom: 6 }}>削除申請</div>
      <div style={{ fontSize: 12, color: D.textSub, marginBottom: 10, lineHeight: 1.6 }}>
        著作権者または正当な代理人のみ申請できます。
      </div>
      <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "10px 14px", marginBottom: 18, fontSize: 11, color: "#d4a84b", lineHeight: 1.6 }}>
        ⚠ 虚偽の申請は法的責任が生じる場合があります。申請内容を確認後、速やかに対応いたします。
      </div>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: D.textSub, marginBottom: 5, fontWeight: 600 }}>申請者名 *</div>
          <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="お名前" style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: D.textSub, marginBottom: 5, fontWeight: 600 }}>メールアドレス *</div>
          <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: D.textSub, marginBottom: 5, fontWeight: 600 }}>該当URL *</div>
          <input required value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://x.com/..." style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: D.textSub, marginBottom: 5, fontWeight: 600 }}>削除理由 *</div>
          <textarea required value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            placeholder="削除を希望する理由をご記入ください..." rows={5}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
        </div>
        <button type="submit"
          style={{ background: "var(--accent)", border: "none", borderRadius: 12, padding: "13px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          メールで送信する
        </button>
      </form>
    </div>
  );
}

// =====================
// メインアプリ
// =====================
export default function App() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";

  const [videos] = useState(INITIAL_VIDEOS);
  const [tab, setTab] = useState("home");
  const [selected, setSelected] = useState(null);
  const [viewArtist, setViewArtist] = useState(null);
  const [viewMember, setViewMember] = useState(null);
  const [saved, setSaved] = useState([]);
  const [profile, setProfile] = useState({ artistId: "kyurushite", memberId: null });
  const [onboardingDone, setOnboardingDone] = useState(
    () => !!localStorage.getItem('torca_onboarding_done')
  );
  const [accentColor, setAccentColor] = useState(
    () => localStorage.getItem('torca_accent') || DEFAULT_ACCENT
  );
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const el = document.documentElement;
    el.style.cssText = "height:100%;margin:0;padding:0;background:#0c0c12;";
    el.style.setProperty("--bg-primary", "#0c0c12");
    el.style.setProperty("--bg-card", "#13121f");
    el.style.setProperty("--bg-card-hover", "#1a1828");
    el.style.setProperty("--accent", accentColor);
    el.style.setProperty("--accent-rgb", ACCENT_RGB_MAP[accentColor] || DEFAULT_ACCENT_RGB);
    el.style.setProperty("--accent-light", "#f472b6");
    el.style.setProperty("--accent2", "#a855f7");
    el.style.setProperty("--text-primary", "#ffffff");
    el.style.setProperty("--text-secondary", "rgba(255,255,255,0.55)");
    el.style.setProperty("--text-muted", "rgba(255,255,255,0.35)");
    el.style.setProperty("--border-subtle", "rgba(232,64,160,0.18)");
    el.style.setProperty("--border-accent", "rgba(232,64,160,0.35)");
    document.body.style.cssText = [
      "height:100%;margin:0;padding:0;overflow:hidden;background:#0c0c12;",
      "font-family:'DM Sans','Noto Sans JP',-apple-system,BlinkMacSystemFont,sans-serif;",
      "-webkit-font-smoothing:antialiased;",
      "background-image:radial-gradient(circle,rgba(255,255,255,0.03) 1px,transparent 1px);",
      "background-size:32px 32px;",
    ].join("");
    const root = document.getElementById("root");
    if (root) root.style.cssText = "width:100%;height:100%;margin:0;padding:0;";
  }, []);

  useEffect(() => {
    const m = profile.memberId ? findMember("kyurushite", profile.memberId) : null;
    applyAccent(m?.color || accentColor);
  }, [profile.memberId]);

  const toggleSave = (id) => setSaved(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const handleOnboardingComplete = ({ memberId, memberColor }) => {
    localStorage.setItem('torca_onboarding_done', '1');
    localStorage.setItem('torca_accent', memberColor);
    document.documentElement.style.setProperty('--accent', memberColor);
    setAccentColor(memberColor);
    setOnboardingDone(true);
    setProfile({ artistId: 'kyurushite', memberId: memberId === 'all' ? null : memberId });
  };

  const navigateTo = (t) => { setTab(t); setViewArtist(null); setViewMember(null); };

  const goToMember = (memberId) => {
    setProfile(p => ({ ...p, memberId }));
    setTab("my");
    setViewArtist(null);
    setViewMember(null);
  };

  if (selected) return (
    <div style={{ width: "100vw", height: "100dvh", overflow: "hidden", fontFamily: "'DM Sans', 'Noto Sans JP', -apple-system, sans-serif", animation: "pageIn 0.25s cubic-bezier(0.4,0,0.2,1)" }}>
      <DetailView v={selected} onBack={() => setSelected(null)} onSave={toggleSave} isSaved={saved.includes(selected.id)} />
    </div>
  );

  const mainTabs = [
    { key: "home",   icon: "🏠", label: "ホーム" },
    { key: "my",     icon: "💖", label: "推し" },
    { key: "search", icon: "🔍", label: "検索" },
    { key: "saved",  icon: "♥",  label: "保存" },
  ];

  const tabTitles = {
    "search":  "🔍 撮可を探す",
    "saved":   "♥ 保存済み",
    "terms":   "利用規約",
    "privacy": "プライバシーポリシー",
    "about":   "運営者情報",
    "takedown":"削除申請",
  };

  const isLegalTab = ["terms","privacy","about","takedown"].includes(tab);

  const renderBody = () => {
    if (viewMember && viewArtist) return (
      <MemberPage artist={findArtist(viewArtist)} member={findMember(viewArtist, viewMember)} videos={videos}
        onSelectVideo={setSelected} onSave={toggleSave} saved={saved} onBack={() => setViewMember(null)} />
    );
    if (viewArtist) return (
      <ArtistPage artist={findArtist(viewArtist)} videos={videos}
        onSelectVideo={setSelected} onSelectMember={(mId) => setViewMember(mId)}
        onSave={toggleSave} saved={saved} onBack={() => setViewArtist(null)} />
    );
    switch (tab) {
      case "home": return (
        <HomeTab videos={videos} profile={profile}
          onSelectVideo={setSelected} onSelectArtist={(id) => setViewArtist(id)}
          onSave={toggleSave} saved={saved} onGoToMember={goToMember} />
      );
      case "my": return (
        <MyTab profile={profile} videos={videos}
          onSelectVideo={setSelected}
          onSelectMember={(aId, mId) => { setViewArtist(aId); setViewMember(mId); }}
          onSave={toggleSave} saved={saved} onChangePush={() => { localStorage.removeItem('torca_onboarding_done'); setOnboardingDone(false); }} />
      );
      case "search": return <SearchTab />;
      case "saved": return saved.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: D.textMuted }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>♡</div>
          <div style={{ fontSize: 13 }}>保存したクリップはありません</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {videos.filter(v => saved.includes(v.id)).map(v => <VideoCard key={v.id} v={v} onSelect={setSelected} onSave={toggleSave} isSaved={true} />)}
        </div>
      );
      case "terms":    return <TermsTab />;
      case "privacy":  return <PrivacyTab />;
      case "about":    return <AboutTab />;
      case "takedown": return <TakedownTab />;
      default: return null;
    }
  };

  const contentKey = `${tab}-${viewArtist || ''}-${viewMember || ''}`;

  return (
    <>
      {!splashDone && <Splash onFinish={() => setSplashDone(true)} />}
      {!onboardingDone && <Onboarding onComplete={handleOnboardingComplete} />}
      <div style={{ fontFamily: "'DM Sans', 'Noto Sans JP', -apple-system, sans-serif", background: D.bg, width: "100vw", height: "100dvh", overflow: "hidden", color: D.text, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* PCサイドバー */}
        {!isMobile && (
          <div style={{ width: 200, flexShrink: 0, background: D.surface, borderRight: `1px solid ${D.border}`, display: "flex", flexDirection: "column", padding: "20px 12px" }}>
            <div style={{ marginBottom: 24, paddingLeft: 8 }}>
              <div style={{ fontSize: 19, fontWeight: 900, letterSpacing: "0.1em", background: "linear-gradient(120deg, #f472b6 0%, #a855f7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>TORCA</div>
              <div style={{ fontSize: 9, color: D.textMuted, letterSpacing: "0.1em", marginTop: 1 }}>きゅるして撮可アーカイブ</div>
              <div style={{ fontSize: 8, color: D.textMuted, marginTop: 4, lineHeight: 1.5 }}>💛💜🩷❤️<br />きゅるしてのための撮可アーカイブ</div>
            </div>
            {mainTabs.map(t => (
              <button key={t.key} onClick={() => navigateTo(t.key)}
                style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", borderRadius: 10, border: tab === t.key ? "1px solid rgba(232,64,160,0.28)" : "1px solid transparent", cursor: "pointer", background: tab === t.key ? "linear-gradient(120deg, rgba(232,64,160,0.18), rgba(168,85,247,0.18))" : "transparent", marginBottom: 2, width: "100%", textAlign: "left", transition: "all 0.22s cubic-bezier(0.4,0,0.2,1)" }}>
                <span style={{ fontSize: tab === t.key ? 17 : 15, transition: "font-size 0.2s cubic-bezier(0.4,0,0.2,1)", display: "block" }}>{t.icon}</span>
                <span style={{ fontSize: 13, fontWeight: tab === t.key ? 700 : 400, color: tab === t.key ? "#f472b6" : D.textSub, transition: "color 0.2s ease" }}>{t.label}</span>
              </button>
            ))}
            <div style={{ marginTop: "auto", fontSize: 9, color: D.textMuted, lineHeight: 1.6, paddingLeft: 8 }}>
              著作権は各権利者に帰属します。
            </div>
          </div>
        )}

        {/* メインコラム */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          {/* ヘッダー */}
          <div style={{ background: "linear-gradient(135deg, #1a0a2e 0%, #130c20 50%, #0f0c1a 100%)", borderBottom: `1px solid ${D.border}`, padding: isMobile ? "10px 14px" : "12px 20px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            {isMobile && (
              <div>
                <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: "0.1em", background: "linear-gradient(120deg, #f472b6 0%, #a855f7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>TORCA</div>
                <div style={{ fontSize: 8, color: D.textMuted, lineHeight: 1.4 }}>💛💜🩷❤️ きゅるしてのための撮可アーカイブ</div>
              </div>
            )}
            {(tab !== "home" || viewArtist || viewMember) && (
              <div style={{ fontSize: 14, fontWeight: 800, color: D.text, flex: 1, textAlign: isMobile ? "center" : "left" }}>
                {viewMember ? `📷 ${findMember(viewArtist, viewMember)?.name}` :
                 viewArtist ? `🎵 ${findArtist(viewArtist)?.name}` :
                 tab === "my" ? "💖 推し" : tabTitles[tab]}
              </div>
            )}
            <div style={{ display: "flex", gap: 6 }}>
              {isLegalTab && (
                <button onClick={() => navigateTo("home")}
                  style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${D.border}`, borderRadius: 8, padding: "5px 10px", color: D.textSub, fontSize: 11, cursor: "pointer" }}>← 戻る</button>
              )}
              <button onClick={() => { localStorage.removeItem('torca_onboarding_done'); setOnboardingDone(false); }}
                style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${D.border}`, borderRadius: 8, padding: "5px 10px", color: D.textSub, fontSize: 11, cursor: "pointer" }}>推し設定</button>
            </div>
          </div>

          {/* ボディ */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            <div key={contentKey} style={{ flex: "1 0 auto", padding: isMobile ? "14px 12px" : "18px 20px", animation: "pageIn 0.22s cubic-bezier(0.4,0,0.2,1)" }}>
              {renderBody()}
            </div>
            {isMobile && <Footer onNav={navigateTo} />}
          </div>

          {/* フッター（PC のみ常時表示） */}
          {!isMobile && <Footer onNav={navigateTo} />}

          {/* モバイル下部ナビ */}
          {isMobile && (
            <div style={{ background: D.surface, borderTop: `1px solid ${D.border}`, display: "flex", justifyContent: "space-around", padding: "8px 0 env(safe-area-inset-bottom, 12px)", flexShrink: 0 }}>
              {mainTabs.map(t => (
                <div key={t.key} onClick={() => navigateTo(t.key)}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer", opacity: tab === t.key ? 1 : 0.45, padding: "4px 6px", flex: 1, transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)", transform: tab === t.key ? "translateY(-2px)" : "translateY(0)" }}>
                  <span style={{ fontSize: tab === t.key ? 21 : 19, transition: "font-size 0.2s cubic-bezier(0.4,0,0.2,1)", display: "block" }}>{t.icon}</span>
                  <span style={{ fontSize: 9, fontWeight: tab === t.key ? 800 : 400, color: tab === t.key ? D.accentLight : D.textMuted, transition: "color 0.2s ease" }}>{t.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
