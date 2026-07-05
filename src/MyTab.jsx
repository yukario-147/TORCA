// src/MyTab.jsx
// 推しタブ：推しメンバーのパーソナライズ画面 + 実データの最新クリップ + 推し活ダッシュボード

import { useEffect } from "react";
import { D, DEFAULT_ACCENT, applyAccent } from "./theme.js";
import { KYURUSHITE, findMember } from "./data.js";
import { MemberFeed } from "./pages.jsx";
import { loadJSON, KEYS, oshiDays } from "./storage.js";
import { nextEvent, daysUntil } from "./events.js";
import { xUrl, tkUrl } from "./data.js";

export default function MyTab({ profile, onSelectMember, onChangePush }) {
  const myMember = profile.memberId ? findMember("kyurushite", profile.memberId) : null;
  const accentColor = myMember?.color || DEFAULT_ACCENT;

  useEffect(() => {
    applyAccent(accentColor);
  }, [accentColor]);

  // 推し活ダッシュボード
  const days = myMember ? oshiDays(myMember.id) : null;
  const bookmarkCount = loadJSON(KEYS.bookmarks, []).length;
  const archiveCount = loadJSON(KEYS.archive, []).length;
  const next = nextEvent();
  const stats = [
    days != null && { icon: "💗", value: `${days}日`, label: "推し歴" },
    { icon: "🔖", value: bookmarkCount, label: "ブックマーク" },
    { icon: "📼", value: archiveCount, label: "アーカイブ" },
    next && { icon: "🎪", value: daysUntil(next.date) === 0 ? "本日" : `${daysUntil(next.date)}日`, label: "次のライブ" },
  ].filter(Boolean);

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

      {/* 推し活ダッシュボード */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 8, marginBottom: 18 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 12, padding: "12px 6px", textAlign: "center" }}>
            <div style={{ fontSize: 14, marginBottom: 3 }}>{s.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: D.text }}>{s.value}</div>
            <div style={{ fontSize: 8, color: D.textSub, marginTop: 2, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {myMember ? (
        <>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>📡 {myMember.name}の最新クリップ</div>
          <MemberFeed member={myMember} limit={8} />

          {/* SNS で推しを直接探す導線 */}
          <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
            <a href={xUrl(`${myMember.name} (推しカメラ OR 撮可) filter:native_video`)} target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, textAlign: "center", background: "rgba(29,161,242,0.1)", border: "1px solid rgba(29,161,242,0.3)", borderRadius: 10, padding: "9px 8px", color: "#1DA1F2", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>
              𝕏 で{myMember.nickname.split(" /")[0]}の撮可 ↗
            </a>
            <a href={tkUrl(`${myMember.name} 推しカメラ`)} target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, textAlign: "center", background: "rgba(105,201,208,0.1)", border: "1px solid rgba(105,201,208,0.3)", borderRadius: 10, padding: "9px 8px", color: "#69C9D0", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>
              ♪ TikTokで探す ↗
            </a>
          </div>
        </>
      ) : (
        <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, padding: "16px", marginBottom: 22, textAlign: "center", color: D.textSub, fontSize: 12, lineHeight: 1.7 }}>
          推しメンバーを選ぶと、専用フィードとテーマカラーが有効になります 💫
        </div>
      )}

      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>💗 メンバーページ</div>
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
