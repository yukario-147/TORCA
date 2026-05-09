import { useState, useEffect } from "react";
import Onboarding from './Onboarding.jsx';
import Splash from './Splash.jsx';

async function callAI(systemPrompt, userMessage) {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemPrompt, userMessage }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text;
}

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
  return (
    <div style={{ background: D.surface, flexShrink: 0 }}>
      {/* グラデーションライン */}
      <div style={{ height: 2, background: "linear-gradient(90deg,#FFD700,#9B59B6,#FF69B4,#E74C3C)", opacity: 0.6 }} />
      <div style={{ padding: "12px 20px" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", marginBottom: 6 }}>
          {[["利用規約","terms"],["プライバシーポリシー","privacy"],["運営者情報","about"],["削除申請","takedown"]].map(([label, t]) => (
            <button key={t} onClick={() => onNav(t)}
              style={{ background: "none", border: "none", color: D.textSub, fontSize: 11, cursor: "pointer", textDecoration: "underline", padding: 0 }}>
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
  const artist = findArtist(v.artistId) || KYURUSHITE;
  const focusMember = v.focusMemberId ? findMember(v.artistId, v.focusMemberId) : null;
  return (
    <div
      onClick={() => onSelect(v)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? "#1a1a28" : "#14141e",
        border: `1px solid ${hover ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 14, overflow: "hidden", cursor: "pointer",
        transition: "all 0.25s ease", transform: hover ? "translateY(-2px)" : "none",
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
          <button onClick={e => { e.stopPropagation(); onSave(v.id); }}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: isSaved ? D.pink : D.textMuted, padding: 0 }}>
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
// AI検索
// =====================
function AISearchTab() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const SYSTEM = `あなたは日本のライブ撮影・推し活文化に詳しいアシスタントです。
ユーザーがアーティスト名を入力したら、SNS（X・TikTok）でファンが投稿しているライブ映像（撮可・推しカメラ・ファンカム・live切り抜きなど）を見つけるためのキーワードを生成してください。

以下のJSONのみ返してください。バッククォート不要。

{
  "artist": "正式なアーティスト名",
  "kana": "読み（カナ）",
  "type": "group or band or solo or duo",
  "description": "アーティストの簡単な紹介（2文以内）",
  "emoji": "アーティストに合う絵文字1文字",
  "primaryTags": ["#最も使われる撮可・ファンカム系タグ", "#〇〇撮可"],
  "secondaryTags": ["#live切り抜き", "#推しカメラ", "#ファンカム", "#〇〇live"],
  "tiktokKeywords": ["○○ 撮可", "○○ ファンカム", "○○ live"],
  "members": [{"name":"メンバー名","searchTerm":"そのメンバーをSNSで検索する時のワード"}],
  "tips": ["撮可・推しカメラを探すコツ1", "コツ2", "コツ3"]
}

membersは、グループの場合のみ実在メンバーを記載。ソロ・バンドの場合は空配列[]。`;

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const raw = await callAI(SYSTEM, query);
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const allXTags = [...(parsed.primaryTags || []), ...(parsed.secondaryTags || [])];
      const orQuery = allXTags.slice(0, 3).join(" OR ");
      setResult({
        ...parsed,
        xOrUrl: xUrl(orQuery),
        tiktokOrUrl: tkUrl((parsed.tiktokKeywords || []).slice(0, 2).join(" ")),
      });
    } catch {
      setError("AIの応答を取得できませんでした。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 17, fontWeight: 900, marginBottom: 4 }}>🤖 AI 撮可検索</div>
        <div style={{ fontSize: 12, color: D.textSub, lineHeight: 1.6 }}>アーティスト名を入力すると、AIが撮可・推しカメラ・ファンカムなど複数のキーワードを生成します。</div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && search()}
          placeholder="例：きゅるりんってしてみて..."
          style={{ flex: 1, background: D.surface, border: `1px solid ${D.border}`, borderRadius: 12, padding: "11px 14px", color: D.text, fontSize: 14, outline: "none" }} />
        <button onClick={search} disabled={loading || !query.trim()}
          style={{ background: loading ? D.textMuted : "var(--accent)", border: "none", borderRadius: 12, padding: "11px 18px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
          {loading ? "..." : "検索"}
        </button>
      </div>
      {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "12px", color: "#f87171", fontSize: 13, marginBottom: 14 }}>{error}</div>}
      {loading && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ fontSize: 28, marginBottom: 10, animation: "spin 1s linear infinite", display: "inline-block" }}>✦</div>
          <div style={{ color: D.textSub, fontSize: 12 }}>AIが複数のキーワードを生成中...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 40 }}>{result.emoji}</span>
            <div>
              <div style={{ fontSize: 17, fontWeight: 900 }}>{result.artist}</div>
              <div style={{ fontSize: 10, color: D.textMuted }}>{result.kana} ・ {result.type}</div>
              <div style={{ fontSize: 11, color: D.textSub, marginTop: 4, lineHeight: 1.5 }}>{result.description}</div>
            </div>
          </div>
          <div style={{ background: "linear-gradient(135deg,rgba(255,105,180,0.12),rgba(232,67,147,0.08))", border: "1px solid rgba(255,105,180,0.3)", borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: D.accentLight, marginBottom: 8 }}>⚡ ワンタップ一括検索（OR検索）</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <a href={result.xOrUrl} target="_blank" rel="noopener noreferrer"
                style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${D.border}`, borderRadius: 10, padding: "10px 12px", textDecoration: "none", textAlign: "center" }}>
                <div style={{ fontSize: 16, marginBottom: 3 }}>𝕏</div>
                <div style={{ fontSize: 11, color: D.text, fontWeight: 700 }}>X 一括検索 ↗</div>
              </a>
              <a href={result.tiktokOrUrl} target="_blank" rel="noopener noreferrer"
                style={{ background: "rgba(255,0,80,0.08)", border: "1px solid rgba(255,0,80,0.2)", borderRadius: 10, padding: "10px 12px", textDecoration: "none", textAlign: "center" }}>
                <div style={{ fontSize: 16, marginBottom: 3 }}>🎵</div>
                <div style={{ fontSize: 11, color: D.text, fontWeight: 700 }}>TikTok 検索 ↗</div>
              </a>
            </div>
          </div>
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: D.accentLight, marginBottom: 8 }}>𝕏 メインタグ</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {result.primaryTags?.map(t => (
                <a key={t} href={xUrl(t)} target="_blank" rel="noopener noreferrer"
                  style={{ background: D.accentBg, border: "1px solid rgba(255,105,180,0.3)", borderRadius: 8, padding: "4px 10px", fontSize: 11, color: D.accentLight, textDecoration: "none", fontWeight: 600 }}>{t} ↗</a>
              ))}
            </div>
            <div style={{ fontSize: 11, fontWeight: 800, color: D.textSub, marginBottom: 8 }}>関連タグ（推しカメラ・ファンカム等）</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {result.secondaryTags?.map(t => (
                <a key={t} href={xUrl(t)} target="_blank" rel="noopener noreferrer"
                  style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${D.border}`, borderRadius: 8, padding: "4px 10px", fontSize: 11, color: D.textSub, textDecoration: "none" }}>{t} ↗</a>
              ))}
            </div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#ff4060", marginBottom: 8 }}>TikTok キーワード</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {result.tiktokKeywords?.map(k => (
                <a key={k} href={tkUrl(k)} target="_blank" rel="noopener noreferrer"
                  style={{ background: "rgba(255,64,96,0.1)", border: "1px solid rgba(255,64,96,0.2)", borderRadius: 8, padding: "4px 10px", fontSize: 11, color: "#ff6080", textDecoration: "none", fontWeight: 600 }}>{k} ↗</a>
              ))}
            </div>
          </div>
          {result.members && result.members.length > 0 && (
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: D.pink, marginBottom: 10 }}>📷 メンバー別検索</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {result.members.map(m => (
                  <a key={m.name} href={xUrl(m.searchTerm)} target="_blank" rel="noopener noreferrer"
                    style={{ background: "rgba(232,67,147,0.08)", border: "1px solid rgba(232,67,147,0.2)", borderRadius: 10, padding: "8px 10px", textDecoration: "none" }}>
                    <div style={{ fontSize: 12, color: D.text, fontWeight: 700 }}>{m.name}</div>
                    <div style={{ fontSize: 9, color: D.textMuted }}>{m.searchTerm} ↗</div>
                  </a>
                ))}
              </div>
            </div>
          )}
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: D.gold, marginBottom: 10 }}>💡 コツ</div>
            {result.tips?.map((tip, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6, fontSize: 11, color: D.textSub, lineHeight: 1.6 }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: D.accentBg, color: D.accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                {tip}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =====================
// URL登録
// =====================
function URLImportTab({ onAdd }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const SYSTEM = `XやTikTokのライブ動画のURL・投稿テキストを解析して、以下のJSONのみ返してください。バッククォート不要。

{
  "artist": "アーティスト名（不明なら不明）",
  "song": "曲名（不明なら不明）",
  "venue": "会場名（不明なら不明）",
  "date": "YYYY-MM-DD（不明なら2025-01-01）",
  "quality": "4K or 1080p or 720p（判断できなければ1080p）",
  "source": "X or TikTok",
  "focusMember": "メンバー名（推しカメラの場合のみ。不明なら空文字）",
  "tags": ["#タグ1", "#タグ2"],
  "confidence": "high or medium or low",
  "note": "AIが自動解析した情報です。正確性をご確認ください。"
}`;

  const analyze = async () => {
    if (!url.trim()) return;
    setLoading(true); setError(null); setPreview(null); setSuccess(false);
    try {
      const raw = await callAI(SYSTEM, url);
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const matched = ARTISTS.find(a =>
        a.name === parsed.artist || a.searchTerms.some(t => parsed.artist?.includes(t))
      );
      let focusMemberId = null;
      if (matched && parsed.focusMember) {
        const m = matched.members.find(mem => mem.name === parsed.focusMember || parsed.focusMember.includes(mem.name));
        if (m) focusMemberId = m.id;
      }
      setPreview({
        ...parsed,
        artistId: matched?.id || "kyurushite",
        artistName: matched?.name || parsed.artist,
        artistColor: matched?.color || "#FF69B4",
        artistEmoji: matched?.emoji || "💗",
        focusMemberId,
        focusMemberName: focusMemberId ? findMember((matched || KYURUSHITE).id, focusMemberId)?.name : null,
        sourceUrl: url.startsWith("http") ? url : "#",
        isAI: true, isOfficial: false,
        views: 1000, likes: 100,
      });
    } catch {
      setError("解析に失敗しました。XまたはTikTokのURLや投稿テキストを入力してください。");
    } finally {
      setLoading(false);
    }
  };

  const register = () => {
    if (!preview) return;
    onAdd({
      id: Date.now(),
      artistId: preview.artistId, focusMemberId: preview.focusMemberId,
      memberIds: preview.focusMemberId ? [preview.focusMemberId] : [],
      song: preview.song, venue: preview.venue, date: preview.date,
      quality: preview.quality, source: preview.source, sourceUrl: preview.sourceUrl,
      tags: preview.tags || [], views: preview.views, likes: preview.likes,
      isOfficial: false, isAI: true, trending: false, note: preview.note,
    });
    setSuccess(true); setUrl(""); setPreview(null);
    setTimeout(() => setSuccess(false), 3000);
  };

  const confColor = { high: D.green, medium: D.gold, low: D.red };
  const confLabel = { high: "✓ 高精度", medium: "△ 中精度", low: "⚠ 低精度" };

  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 17, fontWeight: 900, marginBottom: 4 }}>🔗 URL登録（AI自動解析）</div>
        <div style={{ fontSize: 12, color: D.textSub, lineHeight: 1.6 }}>XまたはTikTokのURL・投稿テキストを貼ると、AIが情報を解析してカードを生成します。</div>
      </div>
      {success && (
        <div style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 12, padding: "11px 14px", color: "#34d399", fontSize: 13, marginBottom: 14, fontWeight: 600 }}>
          ✓ カードを登録しました！
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && analyze()}
          placeholder="https://x.com/... または投稿テキスト"
          style={{ flex: 1, background: D.surface, border: `1px solid ${D.border}`, borderRadius: 12, padding: "11px 14px", color: D.text, fontSize: 13, outline: "none" }} />
        <button onClick={analyze} disabled={loading || !url.trim()}
          style={{ background: loading ? D.textMuted : "var(--accent)", border: "none", borderRadius: 12, padding: "11px 18px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "..." : "解析"}
        </button>
      </div>
      {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "11px", color: "#f87171", fontSize: 13, marginBottom: 14 }}>{error}</div>}
      {loading && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🔍</div>
          <div style={{ color: D.textSub, fontSize: 12 }}>解析中...</div>
        </div>
      )}
      {preview && (
        <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ height: 86, background: `linear-gradient(135deg,${preview.artistColor}25,${preview.artistColor}06)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, position: "relative", borderBottom: `1px solid ${D.border}` }}>
            {preview.artistEmoji}
            <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 4 }}>
              <Badge variant={preview.quality}>{preview.quality}</Badge>
              <Badge variant="ai">✦ AI</Badge>
            </div>
            <div style={{ position: "absolute", top: 8, right: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: confColor[preview.confidence], background: `${confColor[preview.confidence]}18`, border: `1px solid ${confColor[preview.confidence]}30`, borderRadius: 5, padding: "2px 7px" }}>
                {confLabel[preview.confidence]}
              </span>
            </div>
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 10, color: preview.artistColor, fontWeight: 700, marginBottom: 3 }}>{preview.artistName}</div>
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>「{preview.song}」</div>
            {preview.focusMemberName && (
              <div style={{ background: "rgba(232,67,147,0.1)", border: "1px solid rgba(232,67,147,0.3)", borderRadius: 10, padding: "8px 12px", marginBottom: 12, fontSize: 11, color: D.pink, fontWeight: 700 }}>
                📷 推しカメラ：{preview.focusMemberName}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
              {[["📍", preview.venue], ["📅", preview.date], ["🎬", preview.quality], ["📱", preview.source]].map(([l, val]) => (
                <div key={l} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 10, color: D.textMuted }}>{l}</div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ background: D.accentBg, borderRadius: 10, padding: "8px 12px", marginBottom: 12, fontSize: 11, color: D.textSub, lineHeight: 1.6 }}>
              📌 {preview.note}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={register} style={{ flex: 1, background: "var(--accent)", border: "none", borderRadius: 10, padding: 11, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                ✓ 登録
              </button>
              <button onClick={() => setPreview(null)} style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${D.border}`, borderRadius: 10, padding: "11px 14px", color: D.textSub, fontSize: 12, cursor: "pointer" }}>
                取消
              </button>
            </div>
          </div>
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
            style={{ background: quality === q ? "var(--accent)" : "transparent", color: quality === q ? "#fff" : D.textSub, border: `1.5px solid ${quality === q ? "var(--accent)" : D.border}`, borderRadius: 8, padding: "3px 11px", fontSize: 11, fontWeight: quality === q ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap" }}>
            🎬 {q}
          </button>
        ))}
        {SOURCES.map(s => (
          <button key={s} onClick={() => setSource(s)}
            style={{ background: source === s ? "var(--accent)" : "transparent", color: source === s ? "#fff" : D.textSub, border: `1.5px solid ${source === s ? "var(--accent)" : D.border}`, borderRadius: 8, padding: "3px 11px", fontSize: 11, fontWeight: source === s ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap" }}>
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
                  style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: "5px 11px", fontSize: 11, color: D.textSub, cursor: "pointer" }}>
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
              return (
                <div key={v.id} onClick={() => onSelectVideo(v)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderBottom: i < ranking.length - 1 ? `1px solid ${D.border}` : "none", cursor: "pointer" }}>
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

  const [videos, setVideos] = useState(INITIAL_VIDEOS);
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
  const addVideo = (v) => { setVideos(prev => [v, ...prev]); setTab("home"); };

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
    { key: "home",       icon: "🏠", label: "ホーム" },
    { key: "my",         icon: "💖", label: "推し" },
    { key: "ai-search",  icon: "🤖", label: "検索" },
    { key: "url-import", icon: "🔗", label: "投稿" },
    { key: "saved",      icon: "♥",  label: "保存" },
  ];

  const tabTitles = {
    "ai-search":  "🤖 AI 検索",
    "url-import": "🔗 URL登録",
    "saved":      "♥ 保存済み",
    "terms":      "利用規約",
    "privacy":    "プライバシーポリシー",
    "about":      "運営者情報",
    "takedown":   "削除申請",
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
      case "ai-search": return <AISearchTab />;
      case "url-import": return <URLImportTab onAdd={addVideo} />;
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
                style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", borderRadius: 10, border: tab === t.key ? "1px solid rgba(232,64,160,0.28)" : "1px solid transparent", cursor: "pointer", background: tab === t.key ? "linear-gradient(120deg, rgba(232,64,160,0.18), rgba(168,85,247,0.18))" : "transparent", marginBottom: 2, width: "100%", textAlign: "left", transition: "all 0.15s" }}>
                <span style={{ fontSize: 15 }}>{t.icon}</span>
                <span style={{ fontSize: 13, fontWeight: tab === t.key ? 700 : 400, color: tab === t.key ? "#f472b6" : D.textSub }}>{t.label}</span>
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
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer", opacity: tab === t.key ? 1 : 0.4, padding: "4px 6px", flex: 1 }}>
                  <span style={{ fontSize: 19 }}>{t.icon}</span>
                  <span style={{ fontSize: 9, fontWeight: tab === t.key ? 800 : 400, color: tab === t.key ? D.accentLight : D.textMuted }}>{t.label}</span>
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
