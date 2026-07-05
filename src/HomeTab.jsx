// src/HomeTab.jsx
// ホーム：きゅるして公式情報 + YouTube 実データの急上昇・ランキング
// API に接続できない環境ではデモデータ表示にフォールバックする

import { useState } from "react";
import { D, fmt } from "./theme.js";
import { KYURUSHITE, QUALITIES, SOURCES, findArtist, findMember } from "./data.js";
import { VideoCard, ClipRow, Spinner, PlayAllButton } from "./components.jsx";
import { useYouTubeFeed } from "./useFeed.js";
import { useBookmarks, getPrevVisit } from "./storage.js";
import { nextEvent, daysUntil } from "./events.js";

const HOME_FEED_BODY = { userInput: '', filters: { period: 'month' } };

export default function HomeTab({ videos, onSelectVideo, onSave, saved, onGoToMember, onGoLive }) {
  const [search, setSearch] = useState("");
  const [quality, setQuality] = useState("すべて");
  const [source, setSource] = useState("すべて");
  const [hoveredRankId, setHoveredRankId] = useState(null);

  const { items: feed, loading: feedLoading, error: feedError } = useYouTubeFeed('home', HOME_FEED_BODY);
  const { toggle: toggleBookmark, has: isBookmarked } = useBookmarks();

  const hasFeed = !feedLoading && !feedError && feed.length > 0;

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

  // デモデータ（フォールバック用）
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

      {/* 次のライブ カウントダウン */}
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

      {/* 検索 */}
      <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.04)", border: `1px solid ${D.border}`, borderRadius: 12, padding: "9px 12px", gap: 8, marginBottom: 10 }}>
        <span style={{ color: D.textMuted, fontSize: 13 }}>🔍</span>
        <input style={{ background: "none", border: "none", outline: "none", color: D.text, fontSize: 13, flex: 1 }}
          placeholder={hasFeed ? "クリップのタイトルで絞り込み..." : "曲・会場で検索..."} value={search} onChange={e => setSearch(e.target.value)} />
        {search && <span style={{ color: D.textMuted, cursor: "pointer", fontSize: 12 }} onClick={() => setSearch("")}>✕</span>}
      </div>

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

      {/* フォールバック：デモデータ表示 */}
      {!feedLoading && !hasFeed && (
        <>
          <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: "8px 12px", marginBottom: 12, fontSize: 10, color: "#d4a84b", lineHeight: 1.6 }}>
            ⚠ 最新クリップを取得できないため、デモデータを表示しています。
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
        </>
      )}
    </div>
  );
}
