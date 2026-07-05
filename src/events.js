// src/events.js
// ライブ・イベントスケジュール
//
// ★運営が編集するファイル★
// 公式サイト https://www.kyurushite.com/ の最新スケジュールを確認して EVENTS に追記してください。
// 情報の正確性を守るため、確認が取れていないイベントは絶対に載せないこと。
// 未確認の項目を暫定で載せる場合は sample: true を付けると「未確認」バッジが表示されます。
//
// 記入例：
// {
//   id: 'oneman-2026-09',            // 一意なID
//   date: '2026-09-22',              // YYYY-MM-DD
//   title: 'ワンマンライブ タイトル',
//   venue: 'Kアリーナ横浜',
//   kind: 'ワンマン',                 // ワンマン | 対バン | リリイベ | フェス
//   takaInfo: '未発表',               // 撮可情報（公式発表があれば転記）
//   url: 'https://www.kyurushite.com/', // 詳細ページ
// },

export const EVENTS = [];

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
