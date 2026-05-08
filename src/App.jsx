import { useState, useEffect } from "react";

// =====================
// Gemini API
// =====================
async function callAI(systemPrompt, userMessage) {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userMessage }] }],
      }),
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates[0].content.parts[0].text;
}

// =====================
// URL生成（X / TikTok）
// =====================
const xUrl = (q) => `https://x.com/search?q=${encodeURIComponent(q)}&f=live`;
const tkUrl = (q) => `https://www.tiktok.com/search?q=${encodeURIComponent(q)}`;

// =====================
// データ：アーティスト＆メンバー
// =====================
const ARTISTS = [
  {
    id: "kyurushite",
    name: "きゅるりんってしてみて",
    kana: "きゅるして",
    type: "group",
    color: "#ff6b9d",
    emoji: "💗",
    description: "ディアステージ所属の4人組アイドルグループ。「カワイイ・リアリズム」をコンセプトに活動。",
    searchTerms: ["きゅるして", "きゅるりんってしてみて"],
    members: [
      { id: "uta",   name: "島村嬉唄",   kana: "しまむらうた",   color: "#f9ca24", emoji: "💛", catchphrase: "うたちゃん" },
      { id: "yane",  name: "環やね",     kana: "たまきやね",     color: "#a29bfe", emoji: "💜", catchphrase: "やねっち" },
      { id: "yuna",  name: "チバゆな",   kana: "ちばゆな",       color: "#ff6b9d", emoji: "🩷", catchphrase: "チバちゃん" },
      { id: "amu",   name: "逃げ水あむ", kana: "にげみずあむ",   color: "#ff5252", emoji: "❤️", catchphrase: "あむあむ" },
    ],
  },
  {
    id: "mga", name: "Mrs. GREEN APPLE", kana: "ミセスグリーンアップル",
    type: "band", color: "#4ecdc4", emoji: "🍏",
    description: "3人組ロックバンド。圧倒的なポップ感とバンドサウンドが魅力。",
    searchTerms: ["MGA", "ミセス", "Mrs.GREEN APPLE"], members: [],
  },
  {
    id: "yoasobi", name: "YOASOBI", kana: "ヨアソビ",
    type: "duo", color: "#fd79a8", emoji: "🌙",
    description: "Ayase × ikuraによる音楽ユニット。",
    searchTerms: ["YOASOBI", "ヨアソビ"], members: [],
  },
  {
    id: "ado", name: "Ado", kana: "アド",
    type: "solo", color: "#a29bfe", emoji: "🎤",
    description: "圧倒的歌唱力で知られるシンガー。",
    searchTerms: ["Ado"], members: [],
  },
];

const findArtist = (id) => ARTISTS.find(a => a.id === id);
const findMember = (artistId, memberId) => findArtist(artistId)?.members.find(m => m.id === memberId);

// =====================
// データ：動画
// memberIds: 写ってるメンバー / focusMemberId: 推しカメラ対象（中心メンバー）
// =====================
const INITIAL_VIDEOS = [
  // きゅるして：グループ全体ショット
  {
    id: 1, artistId: "kyurushite", focusMemberId: null, memberIds: ["uta","yane","yuna","amu"],
    song: "らぶきゅん♡うぉんてっど", venue: "Zepp Nagoya", date: "2025-03-28", quality: "4K", source: "X",
    sourceUrl: xUrl("#きゅるして撮可"), tags: ["#きゅるして撮可", "#ZeppNagoya"],
    views: 28400, likes: 2340, isOfficial: true, isAI: false, trending: true,
    note: "Zeppツアー「Kyururin Wonderland」初日公演のデモ表示です。",
  },
  // きゅるして：推しカメラ系
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
  // 他アーティスト
  {
    id: 7, artistId: "mga", focusMemberId: null, memberIds: [],
    song: "Soranji", venue: "東京ドーム", date: "2025-04-12", quality: "4K", source: "X",
    sourceUrl: xUrl("#MGA撮可"), tags: ["#MGA撮可", "#東京ドーム"],
    views: 52400, likes: 4983, isOfficial: false, isAI: false, trending: true, note: null,
  },
  {
    id: 8, artistId: "yoasobi", focusMemberId: null, memberIds: [],
    song: "アイドル", venue: "国立競技場", date: "2025-04-18", quality: "1080p", source: "TikTok",
    sourceUrl: tkUrl("YOASOBI ファンカム"), tags: ["#YOASOBI", "#ファンカム"],
    views: 94000, likes: 8800, isOfficial: false, isAI: false, trending: true, note: null,
  },
  {
    id: 9, artistId: "ado", focusMemberId: null, memberIds: [],
    song: "唱", venue: "さいたまスーパーアリーナ", date: "2025-04-20", quality: "4K", source: "X",
    sourceUrl: xUrl("Ado live"), tags: ["#Ado", "#live"],
    views: 85000, likes: 7200, isOfficial: false, isAI: false, trending: false, note: null,
  },
];

const QUALITIES = ["すべて", "4K", "1080p", "720p"];
const SOURCES = ["すべて", "X", "TikTok"];
const SORTS = ["新着順", "再生数", "いいね数"];
const fmt = (n) => n >= 10000 ? (n / 10000).toFixed(1) + "万" : n.toLocaleString();

// =====================
// レスポンシブ
// =====================
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

// =====================
// カラー
// =====================
const D = {
  bg: "#0c0c12", surface: "#13131e", surfaceHover: "#1c1c2a",
  border: "rgba(255,255,255,0.07)", borderHover: "rgba(255,255,255,0.14)",
  text: "#f0eeff", textSub: "#8a82b0", textMuted: "#4a4570",
  accent: "#9d4edd", accentLight: "#c084fc", accentBg: "rgba(157,78,221,0.12)",
  pink: "#e84393", gold: "#f59e0b", green: "#10b981", red: "#ef4444",
};

// =====================
// バッジ
// =====================
function Badge({ children, variant = "default" }) {
  const map = {
    default:  { background: D.accentBg, color: D.accentLight, border: "1px solid rgba(157,78,221,0.25)" },
    "4K":     { background: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.3)" },
    "1080p":  { background: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)" },
    "720p":   { background: "rgba(100,116,139,0.2)", color: "#94a3b8", border: "1px solid rgba(100,116,139,0.3)" },
    official: { background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" },
    trending: { background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" },
    ai:       { background: "rgba(157,78,221,0.2)", color: "#c084fc", border: "1px solid rgba(157,78,221,0.4)" },
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
// ビデオカード
// =====================
function VideoCard({ v, onSelect, onSave, isSaved, showFocus = true }) {
  const [hover, setHover] = useState(false);
  const artist = findArtist(v.artistId);
  const focusMember = v.focusMemberId ? findMember(v.artistId, v.focusMemberId) : null;
  return (
    <div
      onClick={() => onSelect(v)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? D.surfaceHover : D.surface,
        border: `1px solid ${hover ? D.borderHover : D.border}`,
        borderRadius: 14, overflow: "hidden", cursor: "pointer",
        transition: "all 0.18s", transform: hover ? "translateY(-2px)" : "none",
      }}
    >
      <div style={{ height: 90, background: `linear-gradient(135deg,${(focusMember?.color || artist.color)}25,${(focusMember?.color || artist.color)}06)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, position: "relative", borderBottom: `1px solid ${D.border}` }}>
        {focusMember?.emoji || artist.emoji}
        <div style={{ position: "absolute", top: 6, left: 6, display: "flex", gap: 3, flexWrap: "wrap" }}>
          <Badge variant={v.quality}>{v.quality}</Badge>
          {v.trending && <Badge variant="trending">🔥</Badge>}
        </div>
        <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 3 }}>
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
        <div style={{ fontSize: 10, color: artist.color, fontWeight: 700, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{artist.name}</div>
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
// オンボーディング
// =====================
function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [chosen, setChosen] = useState({ artistId: null, memberId: null });

  const skip = () => onComplete({ artistId: null, memberId: null });
  const finish = () => onComplete(chosen);

  return (
    <div style={{ width: "100vw", height: "100dvh", background: D.bg, color: D.text, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Hiragino Sans','Noto Sans JP',sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 28, height: 4, borderRadius: 2, background: i <= step ? D.accent : "rgba(255,255,255,0.1)" }} />
          ))}
        </div>
        <button onClick={skip} style={{ background: "none", border: "none", color: D.textSub, fontSize: 12, cursor: "pointer" }}>スキップ</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {step === 0 && (
          <div>
            <div style={{ fontSize: 30, marginBottom: 14 }}>👋</div>
            <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.3, marginBottom: 12, background: "linear-gradient(90deg,#c084fc,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              TORCAへようこそ
            </div>
            <div style={{ fontSize: 14, color: D.textSub, lineHeight: 1.7, marginBottom: 24 }}>
              ライブの「撮影可能区間（撮可）」の映像を、X・TikTokから集約して見つけやすく整理するアプリです。
            </div>
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, color: D.accentLight }}>✨ できること</div>
              <div style={{ fontSize: 12, color: D.textSub, lineHeight: 1.8 }}>
                • アーティスト・会場・画質で横断検索<br />
                • メンバー別の「推しカメラ」をまとめて表示<br />
                • AIが撮可投稿のキーワードを自動生成<br />
                • URLから情報を自動解析してカード化
              </div>
            </div>
            <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "10px 14px", fontSize: 11, color: "#d4a84b", lineHeight: 1.6, marginBottom: 24 }}>
              ⚠ 動画は直接ホスティングせず、元投稿リンクを表示します。著作権は各権利者に帰属します。
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>推しアーティストは？</div>
            <div style={{ fontSize: 12, color: D.textSub, marginBottom: 20 }}>選ぶとあなた専用の画面でおすすめが表示されます。</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ARTISTS.map(a => (
                <button key={a.id} onClick={() => setChosen({ artistId: a.id, memberId: null })}
                  style={{ background: chosen.artistId === a.id ? `${a.color}18` : D.surface, border: `1.5px solid ${chosen.artistId === a.id ? a.color : D.border}`, borderRadius: 14, padding: 14, textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 30 }}>{a.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: D.text }}>{a.name}</div>
                    <div style={{ fontSize: 10, color: D.textMuted, marginTop: 2 }}>{a.kana}</div>
                  </div>
                  {chosen.artistId === a.id && <span style={{ color: a.color, fontSize: 18 }}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>推しメンバーは？</div>
            <div style={{ fontSize: 12, color: D.textSub, marginBottom: 20 }}>
              {chosen.artistId
                ? `「${findArtist(chosen.artistId).name}」のメンバーから選んでください。`
                : "アーティストを選んでいないのでスキップできます。"}
            </div>
            {chosen.artistId && findArtist(chosen.artistId).members.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {findArtist(chosen.artistId).members.map(m => (
                  <button key={m.id} onClick={() => setChosen(c => ({ ...c, memberId: m.id }))}
                    style={{ background: chosen.memberId === m.id ? `${m.color}25` : D.surface, border: `1.5px solid ${chosen.memberId === m.id ? m.color : D.border}`, borderRadius: 14, padding: 14, textAlign: "center", cursor: "pointer" }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>{m.emoji}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: D.text }}>{m.name}</div>
                    <div style={{ fontSize: 10, color: D.textMuted, marginTop: 2 }}>{m.catchphrase}</div>
                  </button>
                ))}
                <button onClick={() => setChosen(c => ({ ...c, memberId: null }))}
                  style={{ gridColumn: "span 2", background: chosen.memberId === null ? D.accentBg : D.surface, border: `1.5px solid ${chosen.memberId === null ? D.accent : D.border}`, borderRadius: 14, padding: 12, cursor: "pointer", color: D.textSub, fontSize: 12 }}>
                  全員推し（メンバー指定なし）
                </button>
              </div>
            ) : (
              <div style={{ background: D.surface, borderRadius: 14, padding: 20, textAlign: "center", color: D.textMuted, fontSize: 13 }}>
                グループの推しはあとから設定できます
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "16px 20px", display: "flex", gap: 10, flexShrink: 0, borderTop: `1px solid ${D.border}` }}>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)}
            style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 12, padding: "12px 20px", color: D.textSub, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            戻る
          </button>
        )}
        <button onClick={() => step < 2 ? setStep(s => s + 1) : finish()}
          style={{ flex: 1, background: D.accent, border: "none", borderRadius: 12, padding: "12px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          {step < 2 ? "次へ →" : "はじめる ✨"}
        </button>
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
    <div style={{ height: "100%", overflowY: "auto" }}>
      <button onClick={onBack} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: "6px 14px", color: D.text, cursor: "pointer", fontSize: 12, fontWeight: 600, marginBottom: 16 }}>← 戻る</button>

      {/* ヒーロー */}
      <div style={{ background: `linear-gradient(135deg,${artist.color}25,${artist.color}05)`, border: `1px solid ${artist.color}30`, borderRadius: 18, padding: "20px 18px", marginBottom: 18, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ fontSize: 50 }}>{artist.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 19, fontWeight: 900, color: D.text, lineHeight: 1.2 }}>{artist.name}</div>
          <div style={{ fontSize: 10, color: artist.color, fontWeight: 700, marginTop: 2, letterSpacing: "0.06em" }}>「{artist.kana}」</div>
          <div style={{ fontSize: 11, color: D.textSub, marginTop: 6, lineHeight: 1.5 }}>{artist.description}</div>
        </div>
      </div>

      {/* メンバーグリッド（グループのみ） */}
      {artist.members.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>📷 メンバー別「推しカメラ」</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 22 }}>
            {artist.members.map(m => {
              const cnt = videos.filter(v => v.artistId === artist.id && v.focusMemberId === m.id).length;
              return (
                <button key={m.id} onClick={() => onSelectMember(m.id)}
                  style={{ background: `${m.color}15`, border: `1.5px solid ${m.color}30`, borderRadius: 14, padding: 14, cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 6 }}>{m.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: D.text }}>{m.name}</div>
                  <div style={{ fontSize: 9, color: m.color, marginTop: 2, fontWeight: 700 }}>{cnt}件 ↗</div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* 全クリップ */}
      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>🎥 グループ全クリップ <span style={{ fontSize: 10, color: D.textMuted, fontWeight: 400, marginLeft: 6 }}>{groupVideos.length}件</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {groupVideos.map(v => <VideoCard key={v.id} v={v} onSelect={onSelectVideo} onSave={onSave} isSaved={saved.includes(v.id)} />)}
      </div>
    </div>
  );
}

// =====================
// メンバーページ（推しカメラ）
// =====================
function MemberPage({ artist, member, videos, onSelectVideo, onSave, saved, onBack }) {
  const memberVideos = videos.filter(v => v.artistId === artist.id && v.focusMemberId === member.id);
  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      <button onClick={onBack} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: "6px 14px", color: D.text, cursor: "pointer", fontSize: 12, fontWeight: 600, marginBottom: 16 }}>← 戻る</button>

      <div style={{ background: `linear-gradient(135deg,${member.color}30,${member.color}08)`, border: `1px solid ${member.color}40`, borderRadius: 18, padding: "22px 20px", marginBottom: 18, textAlign: "center" }}>
        <div style={{ fontSize: 60, marginBottom: 8 }}>{member.emoji}</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: D.text }}>{member.name}</div>
        <div style={{ fontSize: 11, color: member.color, fontWeight: 700, marginTop: 4, letterSpacing: "0.05em" }}>「{member.catchphrase}」</div>
        <div style={{ fontSize: 10, color: D.textMuted, marginTop: 6 }}>{artist.name}</div>
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
        <div style={{ textAlign: "center", padding: "40px 0", color: D.textMuted, fontSize: 13 }}>
          まだクリップがありません
        </div>
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
  const artist = findArtist(v.artistId);
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
              style={{ position: "absolute", bottom: 12, right: 12, background: D.accent, borderRadius: 12, padding: "10px 18px", color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
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
            <div style={{ background: D.accentBg, border: `1px solid rgba(157,78,221,0.2)`, borderRadius: 12, padding: "10px 14px", marginBottom: 14, fontSize: 11, color: D.textSub, lineHeight: 1.6 }}>
              📌 {v.note}
            </div>
          )}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {v.tags.map(t => (
              <a key={t} href={xUrl(t)} target="_blank" rel="noopener noreferrer"
                style={{ background: D.accentBg, border: `1px solid rgba(157,78,221,0.2)`, borderRadius: 8, padding: "4px 10px", fontSize: 11, color: D.accentLight, textDecoration: "none" }}>{t} ↗</a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================
// AI検索（強化版：複数キーワード並列・OR検索）
// =====================
function AISearchTab() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const SYSTEM = `あなたは日本のライブ撮影・推し活文化に詳しいアシスタントです。
ユーザーがアーティスト名を入力したら、SNS（X・TikTok）でファンが投稿しているライブ映像（撮可・推しカメラ・ファンカム・live切り抜きなど）を見つけるためのキーワードを生成してください。

撮可（さつか）= 公式に許可された撮影可能区間
推しカメラ = 特定メンバーを中心に撮った動画
ファンカム = ファンが撮影した動画
切り抜き = ライブ映像の一部分

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

membersは、グループの場合のみ実在メンバーを記載。ソロ・バンドの場合は空配列[]。
タグは「#」付きで、実在する一般的なものを使うこと。`;

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const raw = await callAI(SYSTEM, query);
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      // OR検索URLを自動生成（ANDではなくスペース区切り = X/TikTokではOR的に動く）
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
          placeholder="例：きゅるりんってしてみて、Mrs. GREEN APPLE..."
          style={{ flex: 1, background: D.surface, border: `1px solid ${D.border}`, borderRadius: 12, padding: "11px 14px", color: D.text, fontSize: 14, outline: "none" }} />
        <button onClick={search} disabled={loading || !query.trim()}
          style={{ background: loading ? D.textMuted : D.accent, border: "none", borderRadius: 12, padding: "11px 18px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
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
          {/* アーティスト */}
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 40 }}>{result.emoji}</span>
            <div>
              <div style={{ fontSize: 17, fontWeight: 900 }}>{result.artist}</div>
              <div style={{ fontSize: 10, color: D.textMuted }}>{result.kana} ・ {result.type}</div>
              <div style={{ fontSize: 11, color: D.textSub, marginTop: 4, lineHeight: 1.5 }}>{result.description}</div>
            </div>
          </div>

          {/* OR検索 */}
          <div style={{ background: "linear-gradient(135deg,rgba(157,78,221,0.12),rgba(232,67,147,0.08))", border: `1px solid rgba(157,78,221,0.3)`, borderRadius: 14, padding: 14 }}>
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

          {/* 個別タグ */}
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: D.accentLight, marginBottom: 8 }}>𝕏 メインタグ</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {result.primaryTags?.map(t => (
                <a key={t} href={xUrl(t)} target="_blank" rel="noopener noreferrer"
                  style={{ background: D.accentBg, border: `1px solid rgba(157,78,221,0.3)`, borderRadius: 8, padding: "4px 10px", fontSize: 11, color: D.accentLight, textDecoration: "none", fontWeight: 600 }}>{t} ↗</a>
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

          {/* メンバー（グループのみ） */}
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

          {/* コツ */}
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
// URL登録（アーティスト/メンバー紐付け対応）
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
      // 既存アーティストとマッチング
      const matched = ARTISTS.find(a =>
        a.name === parsed.artist || a.searchTerms.some(t => parsed.artist?.includes(t))
      );
      // メンバーマッチング
      let focusMemberId = null;
      if (matched && parsed.focusMember) {
        const m = matched.members.find(mem => mem.name === parsed.focusMember || parsed.focusMember.includes(mem.name));
        if (m) focusMemberId = m.id;
      }
      setPreview({
        ...parsed,
        artistId: matched?.id || "unknown",
        artistName: matched?.name || parsed.artist,
        artistColor: matched?.color || "#9d4edd",
        artistEmoji: matched?.emoji || "🎵",
        focusMemberId,
        focusMemberName: focusMemberId ? findMember(matched.id, focusMemberId).name : null,
        sourceUrl: url.startsWith("http") ? url : "#",
        isAI: true,
        isOfficial: false,
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
    const v = {
      id: Date.now(),
      artistId: preview.artistId,
      focusMemberId: preview.focusMemberId,
      memberIds: preview.focusMemberId ? [preview.focusMemberId] : [],
      song: preview.song,
      venue: preview.venue,
      date: preview.date,
      quality: preview.quality,
      source: preview.source,
      sourceUrl: preview.sourceUrl,
      tags: preview.tags || [],
      views: preview.views,
      likes: preview.likes,
      isOfficial: false,
      isAI: true,
      trending: false,
      note: preview.note,
    };
    onAdd(v);
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
          style={{ background: loading ? D.textMuted : D.accent, border: "none", borderRadius: 12, padding: "11px 18px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer" }}>
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
              <button onClick={register} style={{ flex: 1, background: D.accent, border: "none", borderRadius: 10, padding: 11, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
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
// ホーム（ディスカバリー強化）
// =====================
function HomeTab({ videos, profile, onSelectVideo, onSelectArtist, onSave, saved }) {
  const [search, setSearch] = useState("");
  const [quality, setQuality] = useState("すべて");
  const [source, setSource] = useState("すべて");

  // 推し関連動画
  const myArtist = profile.artistId ? findArtist(profile.artistId) : null;
  const myMember = profile.memberId && myArtist ? findMember(myArtist.id, profile.memberId) : null;
  const recommendVideos = videos.filter(v => {
    if (myMember) return v.artistId === profile.artistId && (v.focusMemberId === profile.memberId || v.memberIds.includes(profile.memberId));
    if (myArtist) return v.artistId === profile.artistId;
    return false;
  });
  const trending = videos.filter(v => v.trending);
  const ranking = [...videos].sort((a, b) => b.views - a.views).slice(0, 5);

  // 検索フィルター
  const filtered = videos.filter(v => {
    const artist = findArtist(v.artistId);
    return (
      (search === "" || artist.name.includes(search) || artist.kana.includes(search) || v.song.includes(search) || v.venue.includes(search)) &&
      (quality === "すべて" || v.quality === quality) &&
      (source === "すべて" || v.source === source)
    );
  });
  const isFiltering = search !== "" || quality !== "すべて" || source !== "すべて";

  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      {/* 検索バー */}
      <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.04)", border: `1px solid ${D.border}`, borderRadius: 12, padding: "9px 12px", gap: 8, marginBottom: 10 }}>
        <span style={{ color: D.textMuted, fontSize: 13 }}>🔍</span>
        <input style={{ background: "none", border: "none", outline: "none", color: D.text, fontSize: 13, flex: 1 }}
          placeholder="アーティスト・曲・会場で検索..." value={search} onChange={e => setSearch(e.target.value)} />
        {search && <span style={{ color: D.textMuted, cursor: "pointer", fontSize: 12 }} onClick={() => setSearch("")}>✕</span>}
      </div>
      <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 12, scrollbarWidth: "none" }}>
        {QUALITIES.map(q => (
          <button key={q} onClick={() => setQuality(q)}
            style={{ background: quality === q ? D.accent : "transparent", color: quality === q ? "#fff" : D.textSub, border: `1.5px solid ${quality === q ? D.accent : D.border}`, borderRadius: 8, padding: "3px 11px", fontSize: 11, fontWeight: quality === q ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap" }}>
            🎬 {q}
          </button>
        ))}
        {SOURCES.map(s => (
          <button key={s} onClick={() => setSource(s)}
            style={{ background: source === s ? D.accent : "transparent", color: source === s ? "#fff" : D.textSub, border: `1.5px solid ${source === s ? D.accent : D.border}`, borderRadius: 8, padding: "3px 11px", fontSize: 11, fontWeight: source === s ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap" }}>
            📱 {s}
          </button>
        ))}
      </div>

      {/* 検索中は結果のみ */}
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
          {/* 推しおすすめ */}
          {recommendVideos.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: D.pink, letterSpacing: "0.1em", marginBottom: 2, fontWeight: 700 }}>FOR YOU</div>
                  <div style={{ fontSize: 15, fontWeight: 900 }}>
                    {myMember ? `${myMember.emoji} ${myMember.name}の推しカメラ` : `${myArtist.emoji} ${myArtist.name}`}
                  </div>
                </div>
                <button onClick={() => onSelectArtist(myArtist.id)}
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

          {/* 急上昇 */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: D.red, letterSpacing: "0.1em", marginBottom: 2, fontWeight: 700 }}>🔥 TRENDING</div>
            <div style={{ fontSize: 15, fontWeight: 900 }}>急上昇中のクリップ</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
            {trending.map(v => <VideoCard key={v.id} v={v} onSelect={onSelectVideo} onSave={onSave} isSaved={saved.includes(v.id)} />)}
          </div>

          {/* ランキング */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: D.gold, letterSpacing: "0.1em", marginBottom: 2, fontWeight: 700 }}>🏆 RANKING</div>
            <div style={{ fontSize: 15, fontWeight: 900 }}>再生数ランキング TOP5</div>
          </div>
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 22 }}>
            {ranking.map((v, i) => {
              const a = findArtist(v.artistId);
              return (
                <div key={v.id} onClick={() => onSelectVideo(v)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderBottom: i < ranking.length - 1 ? `1px solid ${D.border}` : "none", cursor: "pointer" }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: i < 3 ? D.gold : D.textMuted, width: 22, textAlign: "center" }}>{i + 1}</div>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg,${a.color}25,${a.color}10)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{a.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 9, color: a.color, fontWeight: 700 }}>{a.name}</div>
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

          {/* アーティスト一覧 */}
          <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 10 }}>アーティスト</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 22 }}>
            {ARTISTS.map(a => {
              const cnt = videos.filter(v => v.artistId === a.id).length;
              return (
                <button key={a.id} onClick={() => onSelectArtist(a.id)}
                  style={{ background: `${a.color}12`, border: `1.5px solid ${a.color}25`, borderRadius: 12, padding: 12, textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 26 }}>{a.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: D.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
                    <div style={{ fontSize: 9, color: a.color, fontWeight: 700, marginTop: 2 }}>{cnt}件</div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// =====================
// 推しタブ（パーソナルハブ）
// =====================
function MyTab({ profile, videos, onSelectVideo, onSelectArtist, onSelectMember, onSave, saved, onChangePush }) {
  const myArtist = profile.artistId ? findArtist(profile.artistId) : null;
  const myMember = profile.memberId && myArtist ? findMember(myArtist.id, profile.memberId) : null;

  if (!myArtist) {
    return (
      <div style={{ height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 50, marginBottom: 14 }}>👀</div>
        <div style={{ fontSize: 17, fontWeight: 900, marginBottom: 8 }}>推しを設定しよう</div>
        <div style={{ fontSize: 12, color: D.textSub, marginBottom: 22, lineHeight: 1.6 }}>推しアーティストを設定すると、<br />おすすめが自動表示されます。</div>
        <button onClick={onChangePush}
          style={{ background: D.accent, border: "none", borderRadius: 12, padding: "11px 26px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          ✨ 推しを設定する
        </button>
      </div>
    );
  }

  const memberVideos = myMember ? videos.filter(v => v.artistId === myArtist.id && v.focusMemberId === myMember.id) : [];
  const groupVideos = videos.filter(v => v.artistId === myArtist.id);

  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      {/* ヘッダー */}
      <div style={{ background: `linear-gradient(135deg,${(myMember?.color || myArtist.color)}30,${(myMember?.color || myArtist.color)}06)`, border: `1px solid ${(myMember?.color || myArtist.color)}40`, borderRadius: 18, padding: "20px 18px", marginBottom: 18, position: "relative" }}>
        <button onClick={onChangePush} style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.3)", border: `1px solid ${D.border}`, borderRadius: 8, padding: "4px 10px", color: D.textSub, fontSize: 10, cursor: "pointer" }}>変更</button>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 50 }}>{myMember?.emoji || myArtist.emoji}</div>
          <div>
            <div style={{ fontSize: 9, color: D.pink, letterSpacing: "0.1em", fontWeight: 700, marginBottom: 2 }}>YOUR PUSH</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: D.text }}>{myMember?.name || myArtist.name}</div>
            <div style={{ fontSize: 10, color: D.textSub, marginTop: 2 }}>
              {myMember ? `${myMember.catchphrase} ・ ${myArtist.name}` : myArtist.kana}
            </div>
          </div>
        </div>
      </div>

      {/* メンバーの推しカメラ */}
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

      {/* グループ全体 */}
      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>🎥 {myArtist.name}全クリップ <span style={{ fontSize: 10, color: D.textMuted, fontWeight: 400 }}>{groupVideos.length}件</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
        {groupVideos.map(v => <VideoCard key={v.id} v={v} onSelect={onSelectVideo} onSave={onSave} isSaved={saved.includes(v.id)} />)}
      </div>

      {/* メンバー切り替え */}
      {myArtist.members.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>📷 全メンバー</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {myArtist.members.map(m => (
              <button key={m.id} onClick={() => onSelectMember(myArtist.id, m.id)}
                style={{ background: m.id === myMember?.id ? `${m.color}25` : `${m.color}12`, border: `1.5px solid ${m.id === myMember?.id ? m.color : `${m.color}25`}`, borderRadius: 12, padding: 12, cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontSize: 26, marginBottom: 4 }}>{m.emoji}</div>
                <div style={{ fontSize: 11, fontWeight: 800 }}>{m.name}</div>
              </button>
            ))}
          </div>
        </>
      )}
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
  const [profile, setProfile] = useState({ artistId: null, memberId: null });
  const [showOnboarding, setShowOnboarding] = useState(true);

  // 全画面スタイル
  useEffect(() => {
    const el = document.documentElement;
    const body = document.body;
    el.style.cssText = "height:100%;margin:0;padding:0;background:#0c0c12;";
    body.style.cssText = "height:100%;margin:0;padding:0;overflow:hidden;background:#0c0c12;";
    const root = document.getElementById("root");
    if (root) root.style.cssText = "width:100%;height:100%;margin:0;padding:0;";
  }, []);

  const toggleSave = (id) => setSaved(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const addVideo = (v) => { setVideos(prev => [v, ...prev]); setTab("home"); };

  const finishOnboarding = (chosen) => {
    setProfile(chosen);
    setShowOnboarding(false);
  };

  // オンボーディング
  if (showOnboarding) return <Onboarding onComplete={finishOnboarding} />;

  // 詳細
  if (selected) return (
    <div style={{ width: "100vw", height: "100dvh", overflow: "hidden", fontFamily: "'Hiragino Sans','Noto Sans JP',sans-serif" }}>
      <DetailView v={selected} onBack={() => setSelected(null)} onSave={toggleSave} isSaved={saved.includes(selected.id)} />
    </div>
  );

  const tabs = [
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
  };

  return (
    <div style={{ fontFamily: "'Hiragino Sans','Noto Sans JP',sans-serif", background: D.bg, width: "100vw", height: "100dvh", overflow: "hidden", color: D.text, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* PCサイドバー */}
        {!isMobile && (
          <div style={{ width: 200, flexShrink: 0, background: D.surface, borderRight: `1px solid ${D.border}`, display: "flex", flexDirection: "column", padding: "20px 12px" }}>
            <div style={{ marginBottom: 24, paddingLeft: 8 }}>
              <div style={{ fontSize: 19, fontWeight: 900, letterSpacing: "-0.04em", background: "linear-gradient(90deg,#c084fc,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>TORCA</div>
              <div style={{ fontSize: 9, color: D.textMuted, letterSpacing: "0.14em" }}>撮可アーカイブ</div>
            </div>
            {tabs.map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); setViewArtist(null); setViewMember(null); }}
                style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", borderRadius: 10, border: "none", cursor: "pointer", background: tab === t.key ? D.accentBg : "transparent", marginBottom: 2, width: "100%", textAlign: "left", transition: "all 0.15s" }}>
                <span style={{ fontSize: 15 }}>{t.icon}</span>
                <span style={{ fontSize: 13, fontWeight: tab === t.key ? 700 : 400, color: tab === t.key ? D.accentLight : D.textSub }}>{t.label}</span>
              </button>
            ))}
            <div style={{ marginTop: "auto", fontSize: 9, color: D.textMuted, lineHeight: 1.6, paddingLeft: 8 }}>
              著作権は各権利者に帰属します。
            </div>
          </div>
        )}

        {/* メイン */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

          {/* ヘッダー */}
          <div style={{ background: D.surface, borderBottom: `1px solid ${D.border}`, padding: isMobile ? "12px 14px" : "14px 20px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            {isMobile && (
              <div>
                <div style={{ fontSize: 17, fontWeight: 900, background: "linear-gradient(90deg,#c084fc,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>TORCA</div>
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
              <button onClick={() => setShowOnboarding(true)}
                style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${D.border}`, borderRadius: 8, padding: "5px 10px", color: D.textSub, fontSize: 11, cursor: "pointer" }}>?</button>
            </div>
          </div>

          {/* ボディ */}
          <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "14px 12px" : "18px 20px" }}>
            {viewMember && viewArtist ? (
              <MemberPage
                artist={findArtist(viewArtist)} member={findMember(viewArtist, viewMember)} videos={videos}
                onSelectVideo={setSelected} onSave={toggleSave} saved={saved}
                onBack={() => setViewMember(null)}
              />
            ) : viewArtist ? (
              <ArtistPage
                artist={findArtist(viewArtist)} videos={videos}
                onSelectVideo={setSelected}
                onSelectMember={(memberId) => setViewMember(memberId)}
                onSave={toggleSave} saved={saved}
                onBack={() => setViewArtist(null)}
              />
            ) : tab === "home" ? (
              <HomeTab videos={videos} profile={profile}
                onSelectVideo={setSelected}
                onSelectArtist={(id) => setViewArtist(id)}
                onSave={toggleSave} saved={saved} />
            ) : tab === "my" ? (
              <MyTab profile={profile} videos={videos}
                onSelectVideo={setSelected}
                onSelectArtist={(id) => setViewArtist(id)}
                onSelectMember={(aId, mId) => { setViewArtist(aId); setViewMember(mId); }}
                onSave={toggleSave} saved={saved}
                onChangePush={() => setShowOnboarding(true)} />
            ) : tab === "ai-search" ? (
              <AISearchTab />
            ) : tab === "url-import" ? (
              <URLImportTab onAdd={addVideo} />
            ) : tab === "saved" ? (
              saved.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: D.textMuted }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>♡</div>
                  <div style={{ fontSize: 13 }}>保存したクリップはありません</div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {videos.filter(v => saved.includes(v.id)).map(v => <VideoCard key={v.id} v={v} onSelect={setSelected} onSave={toggleSave} isSaved={true} />)}
                </div>
              )
            ) : null}
          </div>

          {/* モバイル下部ナビ */}
          {isMobile && (
            <div style={{ background: D.surface, borderTop: `1px solid ${D.border}`, display: "flex", justifyContent: "space-around", padding: "8px 0 env(safe-area-inset-bottom, 12px)", flexShrink: 0 }}>
              {tabs.map(t => (
                <div key={t.key} onClick={() => { setTab(t.key); setViewArtist(null); setViewMember(null); }}
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
  );
}