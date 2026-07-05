// src/events.js
// ライブ・イベントスケジュール
//
// ★運営が編集するファイル★
// 公式サイト https://www.kyurushite.com/ の最新スケジュールに合わせて EVENTS を更新してください。
// sample: true の項目は UI に「サンプル」バッジが表示されます。実データに差し替えたら false に。

export const EVENTS = [
  {
    id: 'summer-fes-2026',
    date: '2026-07-26',
    title: 'サマーアイドル博 2026',
    venue: 'Zepp DiverCity (TOKYO)',
    kind: '対バン',
    takaInfo: '未発表',
    url: 'https://www.kyurushite.com/',
    sample: true,
  },
  {
    id: 'release-event-2026',
    date: '2026-08-30',
    title: '5thミニアルバム リリースイベント',
    venue: 'タワーレコード渋谷',
    kind: 'リリイベ',
    takaInfo: '未発表',
    url: 'https://www.kyurushite.com/',
    sample: true,
  },
  {
    id: 'k-arena-2026',
    date: '2026-09-22',
    title: 'きゅるりんってしてみて ワンマンライブ',
    venue: 'Kアリーナ横浜',
    kind: 'ワンマン',
    takaInfo: '未発表',
    url: 'https://www.kyurushite.com/',
    sample: true,
  },
];

const dayMs = 24 * 60 * 60 * 1000;

// 今日の 0 時を基準に日数差を計算（当日は 0）
export function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.round((target - today) / dayMs);
}

export function upcomingEvents() {
  return EVENTS
    .filter(e => daysUntil(e.date) >= 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function pastEvents() {
  return EVENTS
    .filter(e => daysUntil(e.date) < 0)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function nextEvent() {
  return upcomingEvents()[0] || null;
}

export function formatEventDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const week = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} (${week})`;
}
