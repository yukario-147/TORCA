// src/LiveTab.jsx
// ライブ：イベントスケジュール + 次のライブへのカウントダウン + 撮可ルールの心得

import { D } from './theme.js';
import { upcomingEvents, pastEvents, nextEvent, daysUntil, formatEventDate } from './events.js';

const KIND_COLORS = {
  'ワンマン':  { bg: 'rgba(232,64,160,0.18)', color: '#f472b6' },
  '対バン':    { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
  'リリイベ':  { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
  'フェス':    { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
};

function KindBadge({ kind }) {
  const c = KIND_COLORS[kind] || { bg: 'rgba(255,255,255,0.08)', color: D.textSub };
  return (
    <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 5, background: c.bg, color: c.color }}>
      {kind}
    </span>
  );
}

function EventCard({ ev, highlight = false }) {
  const days = daysUntil(ev.date);
  const isPast = days < 0;
  return (
    <a
      href={ev.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block', textDecoration: 'none', marginBottom: 8,
        background: highlight
          ? 'linear-gradient(135deg,rgba(var(--accent-rgb),0.14),rgba(var(--accent-rgb),0.03))'
          : 'var(--bg-card)',
        border: highlight ? '1px solid rgba(var(--accent-rgb),0.4)' : `1px solid ${D.border}`,
        borderRadius: 14, padding: '13px 14px',
        opacity: isPast ? 0.55 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
        <KindBadge kind={ev.kind} />
        {ev.sample && (
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>
            サンプル
          </span>
        )}
        <span style={{ fontSize: 11, color: D.textSub, fontWeight: 700 }}>{formatEventDate(ev.date)}</span>
        {!isPast && (
          <span style={{ fontSize: 10, color: 'var(--accent-light)', fontWeight: 800, marginLeft: 'auto' }}>
            {days === 0 ? '🎪 本日！' : `あと${days}日`}
          </span>
        )}
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: D.text, lineHeight: 1.4, marginBottom: 3 }}>{ev.title}</div>
      <div style={{ fontSize: 11, color: D.textSub }}>📍 {ev.venue}</div>
      <div style={{ fontSize: 10, color: D.textMuted, marginTop: 5 }}>
        📸 撮可情報：{ev.takaInfo} <span style={{ marginLeft: 6 }}>詳細は公式サイトで確認 ↗</span>
      </div>
    </a>
  );
}

export default function LiveTab() {
  const next = nextEvent();
  const upcoming = upcomingEvents();
  const past = pastEvents();

  return (
    <div style={{ paddingBottom: 40 }}>
      <h2 style={{
        fontSize: 20, fontWeight: 800, margin: '4px 0 4px',
        background: 'linear-gradient(120deg, var(--accent-light), var(--accent2))',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>ライブスケジュール</h2>
      <p style={{ fontSize: 11, color: D.textSub, margin: '0 0 16px', lineHeight: 1.6 }}>
        次の現場に向けて準備しよう。日程・撮可ルールは必ず
        <a href="https://www.kyurushite.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-light)' }}> 公式サイト </a>
        で最終確認を。
      </p>

      {/* カウントダウンヒーロー */}
      {next ? (
        <div style={{
          background: 'linear-gradient(135deg,rgba(var(--accent-rgb),0.2),rgba(168,85,247,0.08))',
          border: '1px solid rgba(var(--accent-rgb),0.35)',
          borderRadius: 18, padding: '22px 18px', marginBottom: 18, textAlign: 'center',
        }}>
          <div style={{ fontSize: 10, color: 'var(--accent-light)', fontWeight: 800, letterSpacing: '0.14em', marginBottom: 8 }}>
            NEXT LIVE
          </div>
          <div style={{ fontSize: 44, fontWeight: 900, color: D.text, lineHeight: 1 }}>
            {daysUntil(next.date) === 0 ? '本日' : (
              <>あと<span style={{ fontSize: 64, margin: '0 6px', background: 'linear-gradient(120deg, var(--accent-light), var(--accent2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{daysUntil(next.date)}</span>日</>
            )}
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: D.text, marginTop: 10 }}>{next.title}</div>
          <div style={{ fontSize: 11, color: D.textSub, marginTop: 3 }}>
            {formatEventDate(next.date)} · 📍 {next.venue}
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: `1px solid ${D.border}`, borderRadius: 14, padding: 20, textAlign: 'center', color: D.textMuted, fontSize: 12, marginBottom: 18 }}>
          予定されているイベント情報がありません。公式サイトをチェックしよう。
        </div>
      )}

      {/* 今後の予定 */}
      {upcoming.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>📅 今後の予定</div>
          {upcoming.map((ev, i) => <EventCard key={ev.id} ev={ev} highlight={i === 0} />)}
        </>
      )}

      {/* 過去のイベント */}
      {past.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 800, margin: '18px 0 10px' }}>🗓 終了したイベント</div>
          {past.map(ev => <EventCard key={ev.id} ev={ev} />)}
        </>
      )}

      {/* 撮可の心得 */}
      <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 14, padding: '14px 16px', marginTop: 18 }}>
        <div style={{ fontSize: 12, color: '#fbbf24', fontWeight: 800, marginBottom: 6 }}>📸 撮可の心得</div>
        <div style={{ fontSize: 11, color: '#d4a84b', lineHeight: 1.9 }}>
          ・撮影可能区間（撮可）のルールは公演ごとに異なります。当日のアナウンスに必ず従いましょう<br />
          ・フラッシュ・自撮り棒・望遠レンズ等は禁止されている場合があります<br />
          ・周りのファンの視界を遮らないように。推しへの愛はマナーから 💗
        </div>
      </div>
    </div>
  );
}
