// src/HomeTab.jsx
// ホーム：公式チャンネルの最新動画（実データ）+ ファン撮可の急上昇・ランキング（実データ）
// 表示される情報はすべて YouTube Data API から取得した実データのみ。
// API に接続できない場合は正直にその旨を表示する（架空データは表示しない）。

import { useState } from "react";
import { KYURUSHITE, SNS_LINKS, shortNick } from "./data.js";
import { OFFICIAL_CHANNEL_IDS } from "./searchDict.js";
import { ClipRow, PlayAllButton, SectionHead, EmptyState, SkeletonRows } from "./components.jsx";
import { Icon } from "./icons.jsx";
import { useYouTubeFeed } from "./useFeed.js";
import { useBookmarks, getPrevVisit } from "./storage.js";
import { nextEvent, daysUntil } from "./events.js";

const HOME_FEED_BODY = { userInput: '', filters: { period: 'month' } };
const OFFICIAL_FEED_BODY = { channelId: OFFICIAL_CHANNEL_IDS[0] };

export default function HomeTab({ onOpenMember, onGoLive, onGoSearch }) {
  const [search, setSearch] = useState("");

  const feed = useYouTubeFeed('home', HOME_FEED_BODY);
  const official = useYouTubeFeed('official', OFFICIAL_FEED_BODY);
  const { toggle: toggleBookmark, has: isBookmarked } = useBookmarks();

  const hasFeed = !feed.loading && !feed.error && feed.items.length > 0;
  const hasOfficial = !official.loading && official.items.length > 0;
  const officialTop = official.items.slice(0, 5);

  // 実データ：撮可スコア→新しさで急上昇、再生数でランキング
  const q = search.trim().toLowerCase();
  const feedFiltered = q
    ? feed.items.filter(v => `${v.title} ${v.channelTitle}`.toLowerCase().includes(q))
    : feed.items;
  const feedTrending = [...feedFiltered]
    .sort((a, b) => ((b.takaScore ?? -1) - (a.takaScore ?? -1)) || (new Date(b.publishedAt) - new Date(a.publishedAt)))
    .slice(0, 6);
  const feedRanking = [...feedFiltered]
    .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
    .slice(0, 5);

  const prevVisit = getPrevVisit();
  const newCount = prevVisit ? feed.items.filter(v => v.publishedAt && v.publishedAt > prevVisit).length : 0;
  const next = nextEvent();
  const nextDays = next ? daysUntil(next.date) : null;

  const retryAll = () => { feed.retry(); official.retry(); };

  return (
    <div>
      {/* ヒーロー：グループ + メンバー */}
      <section className="holo-card" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
          <div>
            <div className="eyebrow">KYURUSHITE</div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "0.02em" }}>きゅるりんってしてみて</div>
            <div style={{ fontSize: 11, color: "var(--text-sub)", fontWeight: 500, marginTop: 2 }}>撮可クリップを探して、観て、残そう ✦</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
          {KYURUSHITE.members.map(m => (
            <button key={m.id} onClick={() => onOpenMember(m.id)} title={`${m.name}のページ`}
              style={{
                padding: "10px 2px 9px", borderRadius: 16, textAlign: "center",
                background: "rgba(255,255,255,0.85)", border: `1.5px solid rgba(${m.colorRgb},0.45)`,
                boxShadow: `0 3px 12px rgba(${m.colorRgb},0.18)`,
              }}>
              <div style={{
                width: 38, height: 38, borderRadius: "50%", margin: "0 auto 5px",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                background: `rgba(${m.colorRgb},0.16)`,
              }}>{m.emoji}</div>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--text)" }}>{shortNick(m)}</div>
            </button>
          ))}
        </div>

        <div className="chip-row">
          {SNS_LINKS.map(({ label, icon, href }) => (
            <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="chip chip-sm" style={{ textDecoration: "none", background: "rgba(255,255,255,0.85)" }}>
              <span style={{ color: "var(--brand)" }}>{icon}</span>{label}
            </a>
          ))}
        </div>
      </section>

      {/* 次のライブ カウントダウン（events.js に実データがある場合のみ） */}
      {next && (
        <button onClick={onGoLive} className="card" style={{
          width: "100%", textAlign: "left", padding: "13px 16px", marginBottom: 18,
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{ textAlign: "center", flexShrink: 0, minWidth: 44 }}>
            <div style={{ fontFamily: "var(--font-logo)", fontSize: 26, fontWeight: 700, lineHeight: 1, color: "var(--accent-deep)" }}>
              {nextDays === 0 ? "今日" : nextDays}
            </div>
            {nextDays !== 0 && <div style={{ fontSize: 9, color: "var(--text-sub)", fontWeight: 800, letterSpacing: "0.1em" }}>DAYS</div>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="eyebrow">NEXT LIVE</div>
            <div style={{ fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{next.title}</div>
            <div style={{ fontSize: 11, color: "var(--text-sub)" }}>📍 {next.venue}</div>
          </div>
          <Icon name="chevron" size={18} style={{ color: "var(--text-muted)" }} />
        </button>
      )}

      {/* 公式チャンネルの最新動画（実データ） */}
      {hasOfficial && (
        <>
          <SectionHead eyebrow="OFFICIAL" title="公式チャンネルの最新動画" action={<PlayAllButton queue={officialTop} />} />
          {officialTop.slice(0, 3).map((v, i) => (
            <ClipRow key={v.videoId} video={v} queue={officialTop} queueIndex={i} bookmarked={isBookmarked(v.videoId)} onToggleBookmark={toggleBookmark} />
          ))}
        </>
      )}

      {feed.loading && (
        <>
          <SectionHead eyebrow="TRENDING" title="急上昇中のクリップ" />
          <SkeletonRows count={4} />
        </>
      )}

      {hasFeed && (
        <>
          <SectionHead
            eyebrow={<>TRENDING{newCount > 0 && <span className="tag" style={{ marginLeft: 8, background: "var(--accent-grad)", color: "var(--on-accent)", letterSpacing: 0, fontFamily: "var(--font)" }}>前回から +{newCount} 新着</span>}</>}
            title="急上昇中のクリップ"
            action={<PlayAllButton queue={feedTrending} />}
          />

          {/* 絞り込み */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <Icon name="search" size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input className="input" style={{ paddingLeft: 38, paddingRight: 38, fontSize: 13, borderRadius: 999 }}
              placeholder="クリップのタイトルで絞り込み…" value={search} onChange={e => setSearch(e.target.value)} />
            {search && (
              <button onClick={() => setSearch("")} aria-label="クリア"
                style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-sub)", background: "var(--surface-2)" }}>
                <Icon name="close" size={13} />
              </button>
            )}
          </div>

          {feedTrending.length === 0 ? (
            <EmptyState icon="🔍" title="該当するクリップがありません">別のキーワードで絞り込んでみてください</EmptyState>
          ) : (
            feedTrending.map((v, i) => (
              <ClipRow key={v.videoId} video={v} queue={feedTrending} queueIndex={i} bookmarked={isBookmarked(v.videoId)} onToggleBookmark={toggleBookmark} />
            ))
          )}

          {feedRanking.length > 0 && (
            <>
              <SectionHead eyebrow="RANKING" title="再生数ランキング TOP5" action={<PlayAllButton queue={feedRanking} />} />
              {feedRanking.map((v, i) => (
                <ClipRow key={v.videoId} video={v} rank={i + 1} queue={feedRanking} queueIndex={i} bookmarked={isBookmarked(v.videoId)} onToggleBookmark={toggleBookmark} />
              ))}
            </>
          )}
        </>
      )}

      {/* API 未接続時：架空データは出さず、正直に伝えて代替導線を出す */}
      {!feed.loading && !hasFeed && (
        <div className="card" style={{ marginTop: hasOfficial ? 18 : 0 }}>
          <EmptyState icon="📡" title="最新クリップを取得できませんでした"
            actions={<>
              <button onClick={retryAll} className="btn btn-primary"><Icon name="refresh" size={15} />再試行</button>
              <button onClick={onGoSearch} className="btn btn-ghost"><Icon name="search" size={15} />さがすタブへ</button>
            </>}>
            通信状況を確認して再試行してください。<br />さがすタブからSNSを直接探すこともできます。
          </EmptyState>
        </div>
      )}
    </div>
  );
}
