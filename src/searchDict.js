// src/searchDict.js
// TORCA 検索クエリ展開辞書（フロントと api/ の両方から使う）

export const OFFICIAL_CHANNEL_IDS = ['UC38ULbpGgiA7t6i-lbLu9VQ'];

export const MEMBER_ALIASES = {
  '島村嬉唄': ['島村嬉唄', 'うたちゃん', 'うちゃたん', 'しまむらうた', 'uta'],
  '嬉唄':     ['島村嬉唄', 'うたちゃん', 'うちゃたん'],
  'うた':     ['島村嬉唄', 'うたちゃん', 'うちゃたん'],
  'うたちゃん':['島村嬉唄', 'うたちゃん', 'うちゃたん'],
  'うちゃたん':['島村嬉唄', 'うたちゃん', 'うちゃたん'],
  'uta':      ['島村嬉唄', 'うたちゃん'],

  '環やね':   ['環やね', 'やねちゃん', 'やねぴ', 'たまきやね', 'yanemint'],
  'やね':     ['環やね', 'やねちゃん', 'やねぴ'],
  'やねちゃん':['環やね', 'やねちゃん', 'やねぴ'],
  'やねぴ':   ['環やね', 'やねちゃん', 'やねぴ'],
  'yanemint': ['環やね', 'やねちゃん', 'やねぴ'],

  'チバゆな': ['チバゆな', 'ゆなちゃん', 'uba_va__3'],
  'ゆな':     ['チバゆな', 'ゆなちゃん'],
  'ゆなちゃん':['チバゆな', 'ゆなちゃん'],
  'チバ':     ['チバゆな', 'ゆなちゃん'],

  '逃げ水あむ':['逃げ水あむ', 'あむちゃん', 'あむち', 'にげみずあむ'],
  'あむ':     ['逃げ水あむ', 'あむちゃん', 'あむち'],
  'あむちゃん':['逃げ水あむ', 'あむちゃん', 'あむち'],
  'あむち':   ['逃げ水あむ', 'あむちゃん', 'あむち'],
};

export const VENUE_ALIASES = {
  '幕張':              ['幕張イベントホール', 'Kyururin Heavenly', 'きゅるちゃん幕張'],
  '幕張イベント':      ['幕張イベントホール', 'Kyururin Heavenly'],
  '幕張イベホ':        ['幕張イベントホール'],
  'Kアリーナ':         ['Kアリーナ横浜', 'きゅるしてKアリ'],
  'Kアリ':             ['Kアリーナ横浜', 'きゅるしてKアリ'],
  '横浜Kアリーナ':     ['Kアリーナ横浜'],
  'zepp新宿':          ['Zepp Shinjuku', '4周年'],
  'Zepp新宿':          ['Zepp Shinjuku', '4周年'],
  'ゼップ新宿':        ['Zepp Shinjuku'],
  '日比谷':            ['日比谷野外音楽堂', '日比谷野音'],
  '日比谷野音':        ['日比谷野外音楽堂'],
  '野音':              ['日比谷野外音楽堂'],
  'zepp名古屋':        ['Zepp Nagoya', 'Kyururin Wonderland'],
  'Zepp名古屋':        ['Zepp Nagoya', 'Kyururin Wonderland'],
  'ゼップ名古屋':      ['Zepp Nagoya'],
  '名古屋':            ['Zepp Nagoya'],
  'かなでびあ':        ['Kanadevia Hall', '東京ドームシティホール'],
  'カナデビアホール':  ['Kanadevia Hall'],
  '東京ドームシティ':  ['Kanadevia Hall', 'Kyururin Wonderland'],
  '東京ドームシティホール': ['Kanadevia Hall'],
};

// API に渡す検索条件の正規化
// 決まった値以外は無視する（不正な入力を防ぎ、CDN キャッシュのキーのばらつきも減らす）
export const MEMBER_NAMES = ['島村嬉唄', '環やね', 'チバゆな', '逃げ水あむ'];

export function normalizeInput(s) {
  if (typeof s !== 'string') return '';
  return Array.from(s.normalize('NFKC').replace(/\s+/g, ' ').trim()).slice(0, 100).join('');
}

export function sanitizeFilters(f) {
  const src = f && typeof f === 'object' ? f : {};
  return {
    member: MEMBER_NAMES.includes(src.member) ? src.member : null,
    venue: typeof src.venue === 'string' && Object.hasOwn(VENUE_ALIASES, src.venue) ? src.venue : null,
    period: src.period === 'week' || src.period === 'month' ? src.period : 'all',
  };
}

// ユーザー入力1つから最大5本の検索クエリを生成
export function expandQueries(userInput, filters = {}) {
  const text = (userInput || '').trim();

  // メンバー名を正規化
  let memberName = '';
  for (const [alias, canonicals] of Object.entries(MEMBER_ALIASES)) {
    if (text.includes(alias)) {
      memberName = canonicals[0];
      break;
    }
  }
  if (!memberName && filters.member && filters.member !== 'all') {
    memberName = MEMBER_ALIASES[filters.member]?.[0] || filters.member;
  }

  // 会場名を正規化
  let venueName = '';
  for (const [alias, venues] of Object.entries(VENUE_ALIASES)) {
    if (text.includes(alias)) {
      venueName = venues[0];
      break;
    }
  }
  if (!venueName && filters.venue) {
    venueName = VENUE_ALIASES[filters.venue]?.[0] || filters.venue;
  }

  if (!text && !memberName && !venueName) {
    return ['きゅるりんってしてみて 撮可 ライブ', 'きゅるして ファン 動画 撮可'];
  }

  const base = text || [memberName, venueName].filter(Boolean).join(' ');
  const set = new Set();

  // A: 入力そのまま + 「きゅるりんってしてみて」
  set.add(`${base} きゅるりんってしてみて`);

  // B: 入力 + 「撮可」+「きゅるして」
  set.add(`${base} 撮可 きゅるして`);

  // C: 正規化したメンバー+会場 + 「きゅるして」
  const canonical = [memberName, venueName].filter(Boolean).join(' ');
  if (canonical) {
    set.add(`${canonical} きゅるして`);
  }

  // D: 入力 + 紐づくメンバー名 + 「ライブ」
  if (memberName && memberName !== base) {
    set.add(`${base} ${memberName} ライブ`);
  } else {
    set.add(`${base} きゅるして ライブ`);
  }

  // E: 入力 + 「きゅるして ファン 動画」
  set.add(`${base} きゅるして ファン 動画`);

  return [...set].slice(0, 5);
}

export function periodToPublishedAfter(period) {
  if (!period || period === 'all') return null;
  const now = new Date();
  if (period === 'week') {
    now.setDate(now.getDate() - 7);
  } else if (period === 'month') {
    now.setMonth(now.getMonth() - 1);
  }
  return now.toISOString();
}
