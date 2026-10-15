// src/pages.jsx
// メンバーページ / メンバー最新クリップフィード

import { xUrl, tkUrl, KYURUSHITE, shortNick } from "./data.js";
import { ACCENTS } from "./theme.js";
import { ClipRow, SkeletonRows, SectionHead, EmptyState, PlayAllButton } from "./components.jsx";
import { Icon } from "./icons.jsx";
import { useYouTubeFeed } from "./useFeed.js";
import { useBookmarks } from "./storage.js";

// =====================
// メンバー最新クリップ（YouTube 実データ）
// MyTab と MemberPage で共用。キャッシュキーをメンバー ID で共有する
// =====================
export function MemberFeed({ member, limit = 5, title }) {
  const { items, loading, error, retry } = useYouTubeFeed(
    `member_${member.id}`,
    { userInput: '', filters: { member: member.name, period: 'all' } },
  );
  const { toggle, has } = useBookmarks();
  const visible = items.slice(0, limit);

  return (
    <>
      <SectionHead eyebrow="LATEST CLIPS" title={title || `${member.name}の最新クリップ`}
        action={!loading && !error && <PlayAllButton queue={visible} />} />
      {loading ? (
        <SkeletonRows count={3} />
      ) : error || items.length === 0 ? (
        <div className="card">
          <EmptyState icon="📡" title="最新クリップを取得できませんでした"
            actions={error && <button className="btn btn-ghost btn-sm" onClick={retry}><Icon name="refresh" size={14} />再試行</button>}>
            さがすタブから「{member.name}」で探してみてください
          </EmptyState>
        </div>
      ) : (
        visible.map((v, i) => (
          <ClipRow key={v.videoId} video={v} queue={visible} queueIndex={i} bookmarked={has(v.videoId)} onToggleBookmark={toggle} />
        ))
      )}
    </>
  );
}

// SNS で推しを直接探す導線
export function MemberSnsLinks({ member }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <a href={xUrl(`${member.name} (推しカメラ OR 撮可) filter:native_video`)} target="_blank" rel="noopener noreferrer"
        className="btn btn-ghost btn-sm" style={{ flex: 1 }}>
        𝕏 で{shortNick(member)}の撮可 <Icon name="external" size={13} />
      </a>
      <a href={tkUrl(`${member.name} 推しカメラ`)} target="_blank" rel="noopener noreferrer"
        className="btn btn-ghost btn-sm" style={{ flex: 1 }}>
        ♪ TikTokで探す <Icon name="external" size={13} />
      </a>
    </div>
  );
}

// メンバーのプロフィールカード
export function MemberHero({ member, label, action }) {
  const pal = ACCENTS[member.id] || ACCENTS.all;
  return (
    <section style={{
      position: "relative", borderRadius: 22, padding: "22px 18px 18px", marginBottom: 4,
      background: `linear-gradient(140deg, ${pal.soft} 0%, #ffffff 70%)`,
      border: `1.5px solid rgba(${member.colorRgb},0.4)`,
      boxShadow: `0 8px 28px rgba(${member.colorRgb},0.18)`,
    }}>
      {action && <div style={{ position: "absolute", top: 14, right: 14 }}>{action}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
        <div style={{
          width: 72, height: 72, borderRadius: "50%", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34,
          background: "#fff", boxShadow: `0 4px 18px rgba(${member.colorRgb},0.35)`,
          border: `3px solid rgba(${member.colorRgb},0.55)`,
        }}>{member.emoji}</div>
        <div style={{ minWidth: 0 }}>
          {label && <div className="eyebrow" style={{ color: pal.deep }}>{label}</div>}
          <div style={{ fontSize: 22, fontWeight: 800 }}>{member.name}</div>
          <div style={{ fontSize: 11.5, color: pal.deep, fontWeight: 700, marginTop: 2 }}>{member.nickname}</div>
          <div style={{ fontSize: 11.5, color: "var(--text-sub)", marginTop: 3 }}>「{member.catchphrase}」</div>
        </div>
      </div>
      <MemberSnsLinks member={member} />
    </section>
  );
}

// =====================
// メンバーページ
// =====================
export function MemberPage({ member, onBack }) {
  return (
    <div>
      <button onClick={onBack} className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }}>
        <Icon name="back" size={14} />戻る
      </button>
      <MemberHero member={member} label={KYURUSHITE.name} />
      <MemberFeed member={member} limit={10} />
    </div>
  );
}
