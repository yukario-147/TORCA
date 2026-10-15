// src/LiveTab.jsx
// ライブ：イベントスケジュール + 次のライブへのカウントダウン + 撮可ルールの心得

import { upcomingEvents, pastEvents, daysUntil, formatEventDate } from './events.js';
import { OFFICIAL_SITE } from './data.js';
import { PageHead, SectionHead, EmptyState } from './components.jsx';
import { Icon } from './icons.jsx';

const KIND_COLORS = {
  'ワンマン': { bg: 'var(--accent-soft)', color: 'var(--accent-deep)' },
  '対バン':   { bg: '#e6f1ff', color: '#2f6fd0' },
  'リリイベ': { bg: 'var(--ok-soft)', color: 'var(--ok)' },
  'フェス':   { bg: 'var(--warn-soft)', color: 'var(--warn)' },
};

function EventCard({ ev, highlight = false }) {
  const days = daysUntil(ev.date);
  const isPast = days < 0;
  const kind = KIND_COLORS[ev.kind] || { bg: 'var(--surface-2)', color: 'var(--text-sub)' };
  return (
    <a href={ev.url || OFFICIAL_SITE} target="_blank" rel="noopener noreferrer" className="card"
      style={{
        display: 'block', textDecoration: 'none', marginBottom: 10, padding: '14px 16px',
        opacity: isPast ? 0.6 : 1,
        ...(highlight ? { borderColor: 'rgba(var(--accent-rgb),0.5)', boxShadow: '0 6px 22px rgba(var(--accent-rgb),0.18)' } : {}),
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
        {ev.kind && <span className="tag" style={{ background: kind.bg, color: kind.color }}>{ev.kind}</span>}
        {ev.sample && <span className="tag" style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}>未確認</span>}
        <span style={{ fontSize: 11.5, color: 'var(--text-sub)', fontWeight: 700 }}>{formatEventDate(ev.date)}</span>
        {!isPast && (
          <span style={{ fontSize: 11, color: 'var(--accent-deep)', fontWeight: 800, marginLeft: 'auto' }}>
            {days === 0 ? '🎪 今日！' : `あと${days}日`}
          </span>
        )}
      </div>
      <div style={{ fontSize: 14.5, fontWeight: 800, lineHeight: 1.4, marginBottom: 3 }}>{ev.title}</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-sub)' }}>📍 {ev.venue}</div>
      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 6 }}>
        📸 撮可情報：{ev.takaInfo || '未発表'} · 詳細は公式サイトで確認 ↗
      </div>
    </a>
  );
}

export default function LiveTab() {
  const upcoming = upcomingEvents();
  const past = pastEvents();
  const next = upcoming[0] || null;
  const nextDays = next ? daysUntil(next.date) : null;

  return (
    <div>
      <PageHead title="ライブスケジュール">
        <p className="page-desc">
          次の現場に向けて準備しよう。日程・撮可ルールは必ず
          <a href={OFFICIAL_SITE} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-deep)', fontWeight: 700 }}> 公式サイト </a>
          で最終確認を。
        </p>
      </PageHead>

      {/* カウントダウンヒーロー */}
      {next ? (
        <section className="holo-card" style={{ textAlign: 'center', padding: '24px 18px', marginBottom: 18 }}>
          <div className="eyebrow">NEXT LIVE</div>
          <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1, margin: '6px 0 4px' }}>
            {nextDays === 0 ? <span className="holo-text" style={{ fontSize: 48 }}>今日！</span> : (
              <>あと<span className="holo-text" style={{ fontFamily: 'var(--font-logo)', fontSize: 64, margin: '0 6px' }}>{nextDays}</span>日</>
            )}
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, marginTop: 8 }}>{next.title}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-sub)', marginTop: 3 }}>
            {formatEventDate(next.date)} · 📍 {next.venue}
          </div>
        </section>
      ) : (
        <div className="card" style={{ marginBottom: 18 }}>
          <EmptyState icon="🎪" title="登録済みのイベント情報がありません"
            actions={<>
              <a href={OFFICIAL_SITE} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">🌐 公式サイト <Icon name="external" size={13} /></a>
              <a href="https://x.com/KYURUSHITE" target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">𝕏 公式アカウント <Icon name="external" size={13} /></a>
              <a href={`https://x.com/search?q=${encodeURIComponent('from:KYURUSHITE (ライブ OR チケット OR 出演)')}&f=live`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">📅 公式のライブ告知 <Icon name="external" size={13} /></a>
            </>}>
            最新のスケジュール・チケット情報は公式の発信をチェック！
          </EmptyState>
        </div>
      )}

      {upcoming.length > 0 && (
        <>
          <SectionHead eyebrow="UPCOMING" title="今後の予定" />
          {upcoming.map((ev, i) => <EventCard key={ev.id} ev={ev} highlight={i === 0} />)}
        </>
      )}

      {past.length > 0 && (
        <>
          <SectionHead eyebrow="ARCHIVE" title="終了したイベント" />
          {past.map(ev => <EventCard key={ev.id} ev={ev} />)}
        </>
      )}

      {/* 撮可の心得 */}
      <div className="notice notice-warn" style={{ marginTop: 20, padding: '14px 16px' }}>
        <div style={{ fontWeight: 800, marginBottom: 6, fontSize: 13 }}>📸 撮可の心得</div>
        <div style={{ fontSize: 11.5, lineHeight: 1.9, color: 'var(--text-sub)' }}>
          ・撮影可能区間（撮可）のルールは公演ごとに異なります。当日のアナウンスに必ず従いましょう<br />
          ・フラッシュ・自撮り棒・望遠レンズ等は禁止されている場合があります<br />
          ・周りのファンの視界を遮らないように。推しへの愛はマナーから 💗
        </div>
      </div>
    </div>
  );
}
