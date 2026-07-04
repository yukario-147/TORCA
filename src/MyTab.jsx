// src/MyTab.jsx
// 推しタブ：推しメンバーのパーソナライズ画面 + 実データの最新クリップ

import { useEffect } from "react";
import { D, DEFAULT_ACCENT, applyAccent } from "./theme.js";
import { KYURUSHITE, findMember } from "./data.js";
import { VideoCard } from "./components.jsx";
import { MemberFeed } from "./pages.jsx";

export default function MyTab({ profile, videos, onSelectVideo, onSelectMember, onSave, saved, onChangePush }) {
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
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>📡 {myMember.name}の最新クリップ</div>
          <MemberFeed member={myMember} limit={5} />

          {memberVideos.length > 0 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>📷 {myMember.name}の推しカメラ <span style={{ fontSize: 10, color: D.textMuted, fontWeight: 400 }}>{memberVideos.length}件</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
                {memberVideos.map(v => <VideoCard key={v.id} v={v} onSelect={onSelectVideo} onSave={onSave} isSaved={saved.includes(v.id)} showFocus={false} />)}
              </div>
            </>
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
