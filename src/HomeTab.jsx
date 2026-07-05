// src/HomeTab.jsx
// ホーム：公式チャンネルの最新動画（実データ）+ ファン撮可の急上昇・ランキング（実データ）
// 表示される情報はすべて YouTube Data API から取得した実データのみ。
// API に接続できない場合は正直にその旨を表示する（架空データは表示しない）。

import { useState } from "react";
import { D } from "./theme.js";
import { KYURUSHITE } from "./data.js";
import { OFFICIAL_CHANNEL_IDS } from "./searchDict.js";
import { ClipRow, Spinner, PlayAllButton } from "./components.jsx";
import { useYouTubeFeed } from "./useFeed.js";
import { useBookmarks, getPrevVisit } from "./storage.js";
import { nextEvent, daysUntil } from "./events.js";

const HOME_FEED_BODY = { userInput: '', filters: { period: 'month' } };
const OFFICIAL_FEED_BODY = { channelId: OFFICIAL_CHANNEL_IDS[0] };

export default function HomeTab({ onGoToMember, onGoLive, onGoSearch }) {
  const [search, setSearch] = useState("");

  const { items: feed, loading: feedLoading, error: feedError } = useYouTubeFeed('home', HOME_FEED_BODY);
  const { items: official, loading: officialLoading } = useYouTubeFeed('official', OFFICIAL_FEED_BODY);
  const { toggle: toggleBookmark, has: isBookmarked } = useBookmarks();

  const hasFeed = !feedLoading && !feedError && feed.length > 0;
  const hasOfficial = !officialLoading && official.length > 0;

  // 実データ：撮可スコア→新しさで急上昇、再生数でランキング
  const feedFiltered = search
    ? feed.filter(v => `${v.title} ${v.channelTitle}`.toLowerCase().includes(search.toLowerCase()))
    : feed;
  const feedTrending = [...feedFiltered]
    .sort((a, b) => ((b.takaScore ?? -1) - (a.takaScore ?? -1)) || (new Date(b.publishedAt) - new Date(a.publishedAt)))
    .slice(0, 6);
  const feedRanking = [...feedFiltered]
    .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
    .slice(0, 5);

  const prevVisit = getPrevVisit();
  const newCount = prevVisit ? feed.filter(v => v.publishedAt && v.publishedAt > prevVisit).length : 0;
  const next = nextEvent();

  return (
    <div>
      {/* きゅるして情報セクション */}
      <div style={{ background: "linear-gradient(135deg,rgba(255,105,180,0.12),rgba(255,105,180,0.02))", border: "1px solid rgba(255,105,180,0.2)", borderRadius: 18, padding: "14px 14px 16px", marginBottom: 16 }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: D.text }}>きゅるりんってしてみて</div>
          <div style={{ fontSize: 10, color: "#FF69B4", fontWeight: 700, marginTop: 2 }}>💗 撮可アーカイブ</div>
        </div>

        {/* メンバーアイコン */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 12 }}>
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
            { label: "🌐 公式サイト", href: "https://www.kyurushite.com/" },
          ].map(({ label, href }) => (
            <a key={href} href={href} target="_blank" rel="noopener noreferrer"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "5px 10px", color: D.text, fontSize: 10, fontWeight: 600, textDecoration: "none", transition: "all 0.25s ease" }}>
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* 次のライブ カウントダウン（events.js に実データがある場合のみ） */}
      {next && (
        <button onClick={onGoLive} style={{
          width: "100%", textAlign: "left", cursor: "pointer",
          background: "linear-gradient(135deg,rgba(var(--accent-rgb),0.14),rgba(168,85,247,0.06))",
          border: "1px solid rgba(var(--accent-rgb),0.3)", borderRadius: 14,
          padding: "12px 14px", marginBottom: 14,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1, background: "linear-gradient(120deg, var(--accent-light), var(--accent2))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {daysUntil(next.date) === 0 ? "本日" : daysUntil(next.date)}
            </div>
            {daysUntil(next.date) !== 0 && <div style={{ fontSize: 8, color: D.textSub, fontWeight: 700 }}>DAYS</div>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, color: "var(--accent-light)", fontWeight: 800, letterSpacing: "0.1em" }}>🎪 NEXT LIVE</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: D.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{next.title}</div>
            <div style={{ fontSize: 10, color: D.textSub }}>📍 {next.venue}</div>
          </div>
          <span style={{ color: D.textMuted, fontSize: 14 }}>›</span>
        </button>
      )}

      {/* 公式チャンネルの最新動画（実データ） */}
      {hasOfficial && (
        <>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: "#a855f7", letterSpacing: "0.1em", marginBottom: 2, fontWeight: 700 }}>🏷 OFFICIAL</div>
              <div style={{ fontSize: 15, fontWeight: 900 }}>公式チャンネルの最新動画</div>
            </div>
            <PlayAllButton queue={official.slice(0, 5)} />
          </div>
          <div style={{ marginBottom: 22 }}>
            {official.slice(0, 3).map((v, i) => (
              <ClipRow key={v.videoId} video={v} queue={official.slice(0, 5)} queueIndex={i} bookmarked={isBookmarked(v.videoId)} onToggleBookmark={toggleBookmark} />
            ))}
          </div>
        </>
      )}

      {/* 検索 */}
      {hasFeed && (
        <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.04)", border: `1px solid ${D.border}`, borderRadius: 12, padding: "9px 12px", gap: 8, marginBottom: 12 }}>
          <span style={{ color: D.textMuted, fontSize: 13 }}>🔍</span>
          <input style={{ background: "none", border: "none", outline: "none", color: D.text, fontSize: 13, flex: 1 }}
            placeholder="クリップのタイトルで絞り込み..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && <span style={{ color: D.textMuted, cursor: "pointer", fontSize: 12 }} onClick={() => setSearch("")}>✕</span>}
        </div>
      )}

      {feedLoading && <Spinner label="最新の撮可クリップを取得中…" />}

      {hasFeed && (
        <>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: D.red, letterSpacing: "0.1em", marginBottom: 2, fontWeight: 700 }}>
                🔥 TRENDING
                {newCount > 0 && (
                  <span style={{ marginLeft: 8, fontSize: 9, fontWeight: 900, padding: "1px 7px", borderRadius: 10, background: "var(--accent)", color: "#fff", letterSpacing: 0 }}>
                    前回から +{newCount} 新着
                  </span>
                )}
              </div>
              <div style={{ fontSize: 15, fontWeight: 900 }}>急上昇中のクリップ</div>
            </div>
            <PlayAllButton queue={feedTrending} />
          </div>
          {feedTrending.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0 32px", color: D.textMuted, fontSize: 12 }}>該当するクリップがありません</div>
          ) : (
            <div style={{ marginBottom: 22 }}>
              {feedTrending.map((v, i) => (
                <ClipRow key={v.videoId} video={v} queue={feedTrending} queueIndex={i} bookmarked={isBookmarked(v.videoId)} onToggleBookmark={toggleBookmark} />
              ))}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: D.gold, letterSpacing: "0.1em", marginBottom: 2, fontWeight: 700 }}>🏆 RANKING</div>
              <div style={{ fontSize: 15, fontWeight: 900 }}>再生数ランキング TOP5</div>
            </div>
            <PlayAllButton queue={feedRanking} />
          </div>
          <div style={{ marginBottom: 8 }}>
            {feedRanking.map((v, i) => (
              <ClipRow key={v.videoId} video={v} rank={i + 1} queue={feedRanking} queueIndex={i} bookmarked={isBookmarked(v.videoId)} onToggleBookmark={toggleBookmark} />
            ))}
          </div>
        </>
      )}

      {/* API 未接続時：架空データは出さず、正直に伝えて代替導線を出す */}
      {!feedLoading && !hasFeed && !hasOfficial && (
        <div style={{ background: "var(--bg-card)", border: `1px solid ${D.border}`, borderRadius: 14, padding: "24px 18px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📡</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: D.text, marginBottom: 6 }}>最新クリップを取得できませんでした</div>
          <div style={{ fontSize: 11, color: D.textSub, lineHeight: 1.7, marginBottom: 14 }}>
            通信状況を確認して再試行してください。<br />検索タブからSNSを直接探すこともできます。
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => window.location.reload()}
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))", border: "none", borderRadius: 10, padding: "9px 18px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              🔄 再試行
            </button>
            <button onClick={onGoSearch}
              style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${D.border}`, borderRadius: 10, padding: "9px 18px", color: D.text, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              🔍 検索タブへ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
