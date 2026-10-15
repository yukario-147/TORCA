// src/MyTab.jsx
// 推しタブ：推しメンバーのパーソナライズ画面 + 実データの最新クリップ + 推し活ダッシュボード

import { KYURUSHITE, shortNick } from "./data.js";
import { MemberFeed, MemberHero } from "./pages.jsx";
import { SectionHead } from "./components.jsx";
import { KEYS, oshiDays, useStoredList } from "./storage.js";
import { nextEvent, daysUntil } from "./events.js";

export default function MyTab({ member, onOpenMember, onChangePush }) {
  const bookmarks = useStoredList(KEYS.bookmarks);
  const archive = useStoredList(KEYS.archive);

  // 推し活ダッシュボード
  const days = member ? oshiDays(member.id) : null;
  const next = nextEvent();
  const stats = [
    days != null && { icon: "💗", value: days, unit: "日", label: "推し歴" },
    { icon: "🔖", value: bookmarks.length, unit: "件", label: "ブックマーク" },
    { icon: "📼", value: archive.length, unit: "件", label: "アーカイブ" },
    next && { icon: "🎪", value: daysUntil(next.date) === 0 ? "今日" : daysUntil(next.date), unit: daysUntil(next.date) === 0 ? "" : "日", label: "次のライブまで" },
  ].filter(Boolean);

  const changeBtn = <button onClick={onChangePush} className="btn btn-ghost btn-sm" style={{ background: "rgba(255,255,255,0.9)" }}>変更</button>;

  return (
    <div>
      {member ? (
        <MemberHero member={member} label="YOUR OSHI" action={changeBtn} />
      ) : (
        <section className="holo-card" style={{ textAlign: "center", padding: "24px 18px" }}>
          <div style={{ position: "absolute", top: 14, right: 14 }}>{changeBtn}</div>
          <div style={{ fontSize: 30, marginBottom: 6 }}>💛💜🩷❤️</div>
          <div className="eyebrow">YOUR OSHI</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>きゅるして全員推し</div>
          <div style={{ fontSize: 12, color: "var(--text-sub)", marginTop: 6, lineHeight: 1.7 }}>
            推しメンバーを選ぶと、専用フィードと<br />テーマカラーが有効になります 💫
          </div>
        </section>
      )}

      {/* 推し活ダッシュボード */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 8, marginTop: 14 }}>
        {stats.map(s => (
          <div key={s.label} className="card" style={{ padding: "12px 4px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 15, marginBottom: 2 }}>{s.icon}</div>
            <div style={{ fontFamily: "var(--font-logo)", fontSize: 20, fontWeight: 700, color: "var(--accent-deep)", lineHeight: 1.2 }}>
              {s.value}<span style={{ fontSize: 11, marginLeft: 1 }}>{s.unit}</span>
            </div>
            <div style={{ fontSize: 9.5, color: "var(--text-sub)", marginTop: 2, fontWeight: 700 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {member && <MemberFeed member={member} limit={8} />}

      <SectionHead eyebrow="MEMBERS" title="メンバーページ" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {KYURUSHITE.members.map(m => {
          const active = m.id === member?.id;
          return (
            <button key={m.id} onClick={() => onOpenMember(m.id)} className="card"
              style={{
                padding: "14px 10px 12px", textAlign: "center",
                borderColor: active ? m.color : `rgba(${m.colorRgb},0.35)`,
                borderWidth: active ? 2 : 1,
                boxShadow: active ? `0 6px 22px rgba(${m.colorRgb},0.3)` : "var(--shadow-sm)",
              }}>
              <div style={{
                width: 46, height: 46, margin: "0 auto 6px", borderRadius: "50%", fontSize: 22,
                display: "flex", alignItems: "center", justifyContent: "center", background: `rgba(${m.colorRgb},0.15)`,
              }}>{m.emoji}</div>
              <div style={{ fontSize: 12.5, fontWeight: 800 }}>{m.name}</div>
              <div style={{ fontSize: 10, color: "var(--text-sub)", marginTop: 2, fontWeight: 700 }}>{shortNick(m)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
